import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for createMetafieldDefinition
const CreateMetafieldDefinitionInputSchema = z.object({
  name: z.string().min(1).describe("The human-readable name for the metafield definition"),
  namespace: z.string().min(1).describe("The namespace for the metafield (e.g., 'custom', 'my_app')"),
  key: z.string().min(1).describe("The key for the metafield (combined with namespace forms the unique identifier)"),
  description: z.string().optional().describe("Description of what this metafield stores"),
  type: z.string().min(1).describe("The metafield type (e.g., 'single_line_text_field', 'multi_line_text_field', 'number_integer', 'number_decimal', 'boolean', 'date', 'date_time', 'json', 'color', 'url', 'file_reference', 'product_reference', 'collection_reference', 'metaobject_reference', 'list.single_line_text_field', 'rich_text_field', 'money', 'rating', 'dimension', 'volume', 'weight')"),
  ownerType: z.enum([
    "PRODUCT",
    "PRODUCTVARIANT",
    "COLLECTION",
    "CUSTOMER",
    "ORDER",
    "DRAFTORDER",
    "LOCATION",
    "PAGE",
    "BLOG",
    "ARTICLE",
    "MARKET",
    "SHOP"
  ]).describe("The resource type this metafield definition applies to"),
  pin: z.boolean().optional().describe("Whether to pin this metafield in the Shopify admin UI"),
  validations: z.array(z.object({
    name: z.string().describe("Validation rule name (e.g., 'min', 'max', 'regex', 'choices')"),
    value: z.string().describe("Validation rule value")
  })).optional().describe("Validation rules for this metafield")
});

type CreateMetafieldDefinitionInput = z.infer<typeof CreateMetafieldDefinitionInputSchema>;

interface MetafieldDefinitionCreateResponse {
  metafieldDefinitionCreate: {
    createdDefinition: {
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
 * Tool for creating a new metafield definition
 * @returns {Object} Created metafield definition details
 */
const createMetafieldDefinition = {
  name: "create-metafield-definition",
  description: "Create a new metafield definition (schema) for a resource type like Product, Variant, Collection, Customer, Order, etc. This defines the structure and validation for metafields on that resource type.",
  schema: CreateMetafieldDefinitionInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetafieldDefinitionInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { name, namespace, key, description, type, ownerType, pin, validations } = input;

      const mutation = gql`
        mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
          metafieldDefinitionCreate(definition: $definition) {
            createdDefinition {
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
        name: string;
        namespace: string;
        key: string;
        type: string;
        ownerType: string;
        description?: string;
        pin?: boolean;
        validations?: Array<{ name: string; value: string }>;
      } = {
        name,
        namespace,
        key,
        type,
        ownerType
      };

      if (description) {
        definitionInput.description = description;
      }

      if (pin !== undefined) {
        definitionInput.pin = pin;
      }

      if (validations) {
        definitionInput.validations = validations;
      }

      const variables = {
        definition: definitionInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetafieldDefinitionCreateResponse;

      if (data.metafieldDefinitionCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create metafield definition: ${data.metafieldDefinitionCreate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metafieldDefinitionCreate.createdDefinition) {
        throw new Error("Metafield definition creation failed: No definition returned");
      }

      const definition = data.metafieldDefinitionCreate.createdDefinition;

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
      console.error("Error creating metafield definition:", error);
      throw new Error(
        `Failed to create metafield definition: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createMetafieldDefinition };
