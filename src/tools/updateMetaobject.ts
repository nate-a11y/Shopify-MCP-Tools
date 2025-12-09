import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updateMetaobject
const UpdateMetaobjectInputSchema = z.object({
  id: z.string().min(1).describe("The GID of the metaobject to update (e.g., \"gid://shopify/Metaobject/1234567890\")"),
  handle: z.string().optional().describe("New handle for the metaobject"),
  fields: z.array(z.object({
    key: z.string().min(1).describe("The field key to update"),
    value: z.string().describe("The new value for the field")
  })).optional().describe("Array of field key-value pairs to update"),
  capabilities: z.object({
    publishable: z.object({
      status: z.enum(["ACTIVE", "DRAFT"]).optional()
    }).optional()
  }).optional().describe("Optional capabilities settings (e.g., publish status)")
});

type UpdateMetaobjectInput = z.infer<typeof UpdateMetaobjectInputSchema>;

interface MetaobjectUpdateResponse {
  metaobjectUpdate: {
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
 * Tool for updating an existing metaobject
 * @returns {Object} Updated metaobject details
 */
const updateMetaobject = {
  name: "update-metaobject",
  description: "Update an existing metaobject's fields, handle, or capabilities",
  schema: UpdateMetaobjectInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateMetaobjectInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { id, handle, fields, capabilities } = input;

      const mutation = gql`
        mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
          metaobjectUpdate(id: $id, metaobject: $metaobject) {
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
        handle?: string;
        fields?: Array<{ key: string; value: string }>;
        capabilities?: {
          publishable?: {
            status?: string;
          };
        };
      } = {};

      if (handle) {
        metaobjectInput.handle = handle;
      }

      if (fields && fields.length > 0) {
        metaobjectInput.fields = fields;
      }

      if (capabilities && Object.keys(capabilities).length > 0) {
        metaobjectInput.capabilities = capabilities;
      }

      // Ensure we have something to update
      if (Object.keys(metaobjectInput).length === 0) {
        throw new Error("No fields provided to update. Please provide handle, fields, or capabilities.");
      }

      const variables = {
        id,
        metaobject: metaobjectInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as MetaobjectUpdateResponse;

      if (data.metaobjectUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update metaobject: ${data.metaobjectUpdate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.metaobjectUpdate.metaobject) {
        throw new Error("Metaobject update failed: No metaobject returned");
      }

      const metaobject = data.metaobjectUpdate.metaobject;

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
      console.error("Error updating metaobject:", error);
      throw new Error(
        `Failed to update metaobject: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateMetaobject };
