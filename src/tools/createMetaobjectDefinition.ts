import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Field definition schema for metaobject definition
const FieldDefinitionSchema = z.object({
  key: z.string().min(1).describe("The key for this field (used in code/API)"),
  name: z.string().optional().describe("The display name for this field"),
  description: z.string().optional().describe("Description of what this field stores"),
  type: z.string().min(1).describe("The metafield type (e.g., 'single_line_text_field', 'multi_line_text_field', 'number_integer', 'number_decimal', 'boolean', 'date', 'date_time', 'json', 'color', 'url', 'file_reference', 'product_reference', 'collection_reference', 'metaobject_reference', 'list.single_line_text_field', etc.)"),
  required: z.boolean().optional().describe("Whether this field is required"),
  validations: z.array(z.object({
    name: z.string().describe("Validation rule name (e.g., 'min', 'max', 'regex', 'choices')"),
    value: z.string().describe("Validation rule value")
  })).optional().describe("Validation rules for this field")
});

// Input schema for createMetaobjectDefinition
const CreateMetaobjectDefinitionInputSchema = z.object({
  type: z.string().min(1).describe("The type identifier for this metaobject definition (e.g., 'author', 'faq', 'testimonial')"),
  name: z.string().optional().describe("The display name for this metaobject definition"),
  description: z.string().optional().describe("Description of this metaobject definition"),
  fieldDefinitions: z.array(FieldDefinitionSchema).min(1).describe("Array of field definitions for this metaobject type"),
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
  displayNameKey: z.string().optional().describe("The field key to use as the display name for entries")
});

type CreateMetaobjectDefinitionInput = z.infer<typeof CreateMetaobjectDefinitionInputSchema>;

interface MetaobjectDefinitionCreateResponse {
  metaobjectDefinitionCreate: {
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
 * Tool for creating a new metaobject definition
 * @returns {Object} Created metaobject definition details
 */
const createMetaobjectDefinition = {
  name: "create-metaobject-definition",
  description: "Create a new metaobject definition (schema) that defines the structure for custom data types. This defines the fields and their types that metaobjects of this type will have.",
  schema: CreateMetaobjectDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetaobjectDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { type, name, description, fieldDefinitions, access, capabilities, displayNameKey } = input;

      const mutation = gql`
        mutation MetaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
          metaobjectDefinitionCreate(definition: $definition) {
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

      // Build the field definitions input
      const fieldDefinitionsInput = fieldDefinitions.map(field => ({
        key: field.key,
        name: field.name,
        description: field.description,
        type: field.type,
        required: field.required,
        validations: field.validations?.map(v => ({
          name: v.name,
          value: v.value
        }))
      }));

      const definitionInput: {
        type: string;
        name?: string;
        description?: string;
        fieldDefinitions: typeof fieldDefinitionsInput;
        access?: { storefront?: string };
        capabilities?: {
          publishable?: { enabled: boolean };
          translatable?: { enabled: boolean };
        };
        displayNameKey?: string;
      } = {
        type,
        fieldDefinitions: fieldDefinitionsInput
      };

      if (name) {
        definitionInput.name = name;
      }

      if (description) {
        definitionInput.description = description;
      }

      if (access) {
        definitionInput.access = access;
      }

      if (capabilities) {
        definitionInput.capabilities = capabilities;
      }

      if (displayNameKey) {
        definitionInput.displayNameKey = displayNameKey;
      }

      const variables = {
        definition: definitionInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectDefinitionCreateResponse;

      if (data.metaobjectDefinitionCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create metaobject definition: ${data.metaobjectDefinitionCreate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectDefinitionCreate.metaobjectDefinition) {
        throw new Error("Metaobject definition creation failed: No definition returned");
      }

      const definition = data.metaobjectDefinitionCreate.metaobjectDefinition;

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
      console.error("Error creating metaobject definition:", error);
      throw new Error(
        `Failed to create metaobject definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createMetaobjectDefinition };
