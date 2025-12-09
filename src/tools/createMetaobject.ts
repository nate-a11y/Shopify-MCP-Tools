import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for createMetaobject
const CreateMetaobjectInputSchema = z.object({
  type: z.string().min(1).describe("The metaobject definition type (e.g., \"custom_type\"). Must match an existing metaobject definition."),
  handle: z.string().optional().describe("Optional handle for the metaobject. If not provided, Shopify will generate one."),
  fields: z.array(z.object({
    key: z.string().min(1).describe("The field key as defined in the metaobject definition"),
    value: z.string().describe("The value for the field")
  })).min(1).describe("Array of field key-value pairs to set on the metaobject"),
  capabilities: z.object({
    publishable: z.object({
      status: z.enum(["ACTIVE", "DRAFT"]).optional()
    }).optional()
  }).optional().describe("Optional capabilities settings (e.g., publish status)")
});

type CreateMetaobjectInput = z.infer<typeof CreateMetaobjectInputSchema>;

interface MetaobjectCreateResponse {
  metaobjectCreate: {
    metaobject: {
      id: string;
      handle: string;
      type: string;
      displayName: string;
      updatedAt: string;
      fields: Array<{
        key: string;
        value: string;
        type: string;
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
 * Tool for creating a new metaobject
 * @returns {Object} Created metaobject details
 */
const createMetaobject = {
  name: "create-metaobject",
  description: "Create a new metaobject of a specific type. The metaobject type must already be defined in Shopify admin under Settings > Custom data.",
  schema: CreateMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetaobjectInput) => {
    try {
      const { type, handle, fields, capabilities } = input;

      const mutation = gql`
        mutation MetaobjectCreate($metaobject: MetaobjectCreateInput!) {
          metaobjectCreate(metaobject: $metaobject) {
            metaobject {
              id
              handle
              type
              displayName
              updatedAt
              fields {
                key
                value
                type
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

      const metaobjectInput: {
        type: string;
        handle?: string;
        fields: Array<{ key: string; value: string }>;
        capabilities?: {
          publishable?: {
            status?: string;
          };
        };
      } = {
        type,
        fields
      };

      if (handle) {
        metaobjectInput.handle = handle;
      }

      if (capabilities) {
        metaobjectInput.capabilities = capabilities;
      }

      const variables = {
        metaobject: metaobjectInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectCreateResponse;

      if (data.metaobjectCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create metaobject: ${data.metaobjectCreate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectCreate.metaobject) {
        throw new Error("Metaobject creation failed: No metaobject returned");
      }

      const metaobject = data.metaobjectCreate.metaobject;

      // Convert fields array to a key-value object for easier consumption
      const fieldsObject: Record<string, { value: string; type: string }> = {};
      metaobject.fields.forEach((field) => {
        fieldsObject[field.key] = {
          value: field.value,
          type: field.type
        };
      });

      return {
        success: true,
        metaobject: {
          id: metaobject.id,
          handle: metaobject.handle,
          type: metaobject.type,
          displayName: metaobject.displayName,
          updatedAt: metaobject.updatedAt,
          fields: fieldsObject,
          fieldsArray: metaobject.fields
        }
      };
    } catch (error) {
      console.error("Error creating metaobject:", error);
      throw new Error(
        `Failed to create metaobject: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createMetaobject };
