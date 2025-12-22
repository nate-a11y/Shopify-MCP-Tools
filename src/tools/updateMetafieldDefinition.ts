import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updateMetafieldDefinition
const UpdateMetafieldDefinitionInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metafield definition to update (e.g., 'gid://shopify/MetafieldDefinition/123456')"),
  name: z.string().optional().describe("The new human-readable name for the metafield definition"),
  description: z.string().optional().describe("The new description of what this metafield stores"),
  pin: z.boolean().optional().describe("Whether to pin this metafield in the Shopify admin UI"),
  validations: z.array(z.object({
    name: z.string().describe("Validation rule name"),
    value: z.string().describe("Validation rule value")
  })).optional().describe("New validation rules (replaces existing validations)")
});

type UpdateMetafieldDefinitionInput = z.infer<typeof UpdateMetafieldDefinitionInputSchema>;

interface MetafieldDefinitionUpdateResponse {
  metafieldDefinitionUpdate: {
    updatedDefinition: {
      id: string;
      name: string;
      namespace: string;
      key: string;
      description: string | null;
      type: {
        name: string;
      };
      ownerType: string;
      pinnedPosition: number | null;
      validations: Array<{
        name: string;
        value: string | null;
      }>;
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
 * Tool for updating an existing metafield definition
 * @returns {Object} Updated metafield definition details
 */
const updateMetafieldDefinition = {
  name: "update-metafield-definition",
  description: "Update an existing metafield definition. You can change the name, description, pin status, and validations. Note: namespace, key, type, and ownerType cannot be changed after creation.",
  schema: UpdateMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMetafieldDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id, name, description, pin, validations } = input;

      const mutation = gql`
        mutation MetafieldDefinitionUpdate($definition: MetafieldDefinitionUpdateInput!) {
          metafieldDefinitionUpdate(definition: $definition) {
            updatedDefinition {
              id
              name
              namespace
              key
              description
              type {
                name
              }
              ownerType
              pinnedPosition
              validations {
                name
                value
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
        id: string;
        name?: string;
        description?: string;
        pin?: boolean;
        validations?: Array<{ name: string; value: string }>;
      } = { id };

      if (name !== undefined) {
        definitionInput.name = name;
      }

      if (description !== undefined) {
        definitionInput.description = description;
      }

      if (pin !== undefined) {
        definitionInput.pin = pin;
      }

      if (validations !== undefined) {
        definitionInput.validations = validations;
      }

      const variables = {
        definition: definitionInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldDefinitionUpdateResponse;

      if (data.metafieldDefinitionUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update metafield definition: ${data.metafieldDefinitionUpdate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metafieldDefinitionUpdate.updatedDefinition) {
        throw new Error("Metafield definition update failed: No definition returned");
      }

      const definition = data.metafieldDefinitionUpdate.updatedDefinition;

      return {
        success: true,
        metafieldDefinition: {
          id: definition.id,
          name: definition.name,
          namespace: definition.namespace,
          key: definition.key,
          description: definition.description,
          type: definition.type.name,
          ownerType: definition.ownerType,
          pinnedPosition: definition.pinnedPosition,
          validations: definition.validations
        }
      };
    } catch (error) {
      console.error("Error updating metafield definition:", error);
      throw new Error(
        `Failed to update metafield definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateMetafieldDefinition };
