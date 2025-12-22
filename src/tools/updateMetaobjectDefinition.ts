import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Field definition update schema
const FieldDefinitionUpdateSchema = z.object({
  key: z.string().min(1).describe("The key of the field to update (must match existing field)"),
  name: z.string().optional().describe("The display name for this field"),
  description: z.string().optional().describe("Description of what this field stores"),
  required: z.boolean().optional().describe("Whether this field is required"),
  validations: z.array(z.object({
    name: z.string().describe("Validation rule name"),
    value: z.string().describe("Validation rule value")
  })).optional().describe("Validation rules for this field")
});

// Field definition create schema (for adding new fields)
const FieldDefinitionCreateSchema = z.object({
  key: z.string().min(1).describe("The key for this new field"),
  name: z.string().optional().describe("The display name for this field"),
  description: z.string().optional().describe("Description of what this field stores"),
  type: z.string().min(1).describe("The metafield type for this new field"),
  required: z.boolean().optional().describe("Whether this field is required"),
  validations: z.array(z.object({
    name: z.string().describe("Validation rule name"),
    value: z.string().describe("Validation rule value")
  })).optional().describe("Validation rules for this field")
});

// Input schema for updateMetaobjectDefinition
const UpdateMetaobjectDefinitionInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metaobject definition to update (e.g., 'gid://shopify/MetaobjectDefinition/123456')"),
  name: z.string().optional().describe("The display name for this metaobject definition"),
  description: z.string().optional().describe("Description of this metaobject definition"),
  fieldDefinitionsToUpdate: z.array(FieldDefinitionUpdateSchema).optional().describe("Existing field definitions to update"),
  fieldDefinitionsToCreate: z.array(FieldDefinitionCreateSchema).optional().describe("New field definitions to add"),
  fieldDefinitionsToDelete: z.array(z.string()).optional().describe("Keys of field definitions to delete"),
  access: z.object({
    storefront: z.enum(["NONE", "PUBLIC_READ"]).optional().describe("Storefront API access level")
  }).optional().describe("Access settings for this metaobject definition"),
  capabilities: z.object({
    publishable: z.object({
      enabled: z.boolean()
    }).optional().describe("Whether entries can be published/unpublished"),
    translatable: z.object({
      enabled: z.boolean()
    }).optional().describe("Whether entries can be translated")
  }).optional().describe("Capabilities for this metaobject definition"),
  displayNameKey: z.string().optional().describe("The field key to use as the display name for entries"),
  resetFieldOrder: z.boolean().optional().describe("Reset field order based on the order in fieldDefinitionsToUpdate")
});

type UpdateMetaobjectDefinitionInput = z.infer<typeof UpdateMetaobjectDefinitionInputSchema>;

interface MetaobjectDefinitionUpdateResponse {
  metaobjectDefinitionUpdate: {
    metaobjectDefinition: {
      id: string;
      type: string;
      name: string;
      description: string | null;
      displayNameKey: string | null;
      fieldDefinitions: Array<{
        key: string;
        name: string;
        description: string | null;
        type: {
          name: string;
        };
        required: boolean;
        validations: Array<{
          name: string;
          value: string | null;
        }>;
      }>;
      access: {
        storefront: string;
      };
      capabilities: {
        publishable: {
          enabled: boolean;
        };
        translatable: {
          enabled: boolean;
        };
      };
    } | null;
    userErrors: Array<{
      field: string[];
      message: string;
      code: string;
    }>;
  };
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

/**
 * Tool for updating an existing metaobject definition
 * @returns {Object} Updated metaobject definition details
 */
const updateMetaobjectDefinition = {
  name: "update-metaobject-definition",
  description: "Update an existing metaobject definition. You can modify field definitions, add new fields, delete fields, change access settings, and update capabilities.",
  schema: UpdateMetaobjectDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMetaobjectDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const {
        id,
        name,
        description,
        fieldDefinitionsToUpdate,
        fieldDefinitionsToCreate,
        fieldDefinitionsToDelete,
        access,
        capabilities,
        displayNameKey,
        resetFieldOrder
      } = input;

      const mutation = gql`
        mutation MetaobjectDefinitionUpdate($id: ID!, $definition: MetaobjectDefinitionUpdateInput!) {
          metaobjectDefinitionUpdate(id: $id, definition: $definition) {
            metaobjectDefinition {
              id
              type
              name
              description
              displayNameKey
              fieldDefinitions {
                key
                name
                description
                type {
                  name
                }
                required
                validations {
                  name
                  value
                }
              }
              access {
                storefront
              }
              capabilities {
                publishable {
                  enabled
                }
                translatable {
                  enabled
                }
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const definitionInput: {
        name?: string;
        description?: string;
        fieldDefinitions?: Array<{
          update?: {
            key: string;
            name?: string;
            description?: string;
            required?: boolean;
            validations?: Array<{ name: string; value: string }>;
          };
          create?: {
            key: string;
            name?: string;
            description?: string;
            type: string;
            required?: boolean;
            validations?: Array<{ name: string; value: string }>;
          };
          delete?: {
            key: string;
          };
        }>;
        access?: { storefront?: string };
        capabilities?: {
          publishable?: { enabled: boolean };
          translatable?: { enabled: boolean };
        };
        displayNameKey?: string;
        resetFieldOrder?: boolean;
      } = {};

      if (name !== undefined) {
        definitionInput.name = name;
      }

      if (description !== undefined) {
        definitionInput.description = description;
      }

      // Build field definitions array with update/create/delete operations
      const fieldDefinitions: Array<{
        update?: {
          key: string;
          name?: string;
          description?: string;
          required?: boolean;
          validations?: Array<{ name: string; value: string }>;
        };
        create?: {
          key: string;
          name?: string;
          description?: string;
          type: string;
          required?: boolean;
          validations?: Array<{ name: string; value: string }>;
        };
        delete?: {
          key: string;
        };
      }> = [];

      if (fieldDefinitionsToUpdate) {
        fieldDefinitionsToUpdate.forEach(field => {
          fieldDefinitions.push({
            update: {
              key: field.key,
              name: field.name,
              description: field.description,
              required: field.required,
              validations: field.validations
            }
          });
        });
      }

      if (fieldDefinitionsToCreate) {
        fieldDefinitionsToCreate.forEach(field => {
          fieldDefinitions.push({
            create: {
              key: field.key,
              name: field.name,
              description: field.description,
              type: field.type,
              required: field.required,
              validations: field.validations
            }
          });
        });
      }

      if (fieldDefinitionsToDelete) {
        fieldDefinitionsToDelete.forEach(key => {
          fieldDefinitions.push({
            delete: {
              key
            }
          });
        });
      }

      if (fieldDefinitions.length > 0) {
        definitionInput.fieldDefinitions = fieldDefinitions;
      }

      if (access) {
        definitionInput.access = access;
      }

      if (capabilities) {
        definitionInput.capabilities = capabilities;
      }

      if (displayNameKey !== undefined) {
        definitionInput.displayNameKey = displayNameKey;
      }

      if (resetFieldOrder !== undefined) {
        definitionInput.resetFieldOrder = resetFieldOrder;
      }

      const variables = {
        id,
        definition: definitionInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectDefinitionUpdateResponse;

      if (data.metaobjectDefinitionUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update metaobject definition: ${data.metaobjectDefinitionUpdate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectDefinitionUpdate.metaobjectDefinition) {
        throw new Error("Metaobject definition update failed: No definition returned");
      }

      const definition = data.metaobjectDefinitionUpdate.metaobjectDefinition;

      return {
        success: true,
        metaobjectDefinition: {
          id: definition.id,
          type: definition.type,
          name: definition.name,
          description: definition.description,
          displayNameKey: definition.displayNameKey,
          fieldDefinitions: definition.fieldDefinitions.map(field => ({
            key: field.key,
            name: field.name,
            description: field.description,
            type: field.type.name,
            required: field.required,
            validations: field.validations
          })),
          access: definition.access,
          capabilities: definition.capabilities
        }
      };
    } catch (error) {
      console.error("Error updating metaobject definition:", error);
      throw new Error(
        `Failed to update metaobject definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateMetaobjectDefinition };
