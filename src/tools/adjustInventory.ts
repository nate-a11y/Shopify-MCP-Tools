import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Inventory change schema
const InventoryChangeSchema = z.object({
  inventoryItemId: z.string().min(1).describe("The GID of the inventory item (e.g., 'gid://shopify/InventoryItem/123456')"),
  locationId: z.string().min(1).describe("The GID of the location (e.g., 'gid://shopify/Location/123456')"),
  delta: z.number().int().describe("The quantity adjustment. Positive to increase, negative to decrease.")
});

// Input schema for adjustInventory
const AdjustInventoryInputSchema = z.object({
  reason: z.enum([
    "CORRECTION",
    "CYCLE_COUNT_AVAILABLE",
    "DAMAGED",
    "MOVEMENT_CREATED",
    "MOVEMENT_UPDATED",
    "MOVEMENT_RECEIVED",
    "MOVEMENT_CANCELED",
    "OTHER",
    "PROMOTION",
    "QUALITY_CONTROL",
    "RECEIVED",
    "RESERVATION_CREATED",
    "RESERVATION_DELETED",
    "RESERVATION_UPDATED",
    "RESTOCK",
    "SAFETY_STOCK",
    "SHRINKAGE"
  ]).describe("The reason for the inventory adjustment"),
  name: z.string().min(1).describe("A name or reference for this adjustment (e.g., 'Weekly inventory count')"),
  changes: z.array(InventoryChangeSchema).min(1).describe("Array of inventory changes to make"),
  referenceDocumentUri: z.string().optional().describe("Optional URI to a reference document for this adjustment")
});

type AdjustInventoryInput = z.infer<typeof AdjustInventoryInputSchema>;

interface InventoryAdjustQuantitiesResponse {
  inventoryAdjustQuantities: {
    inventoryAdjustmentGroup: {
      id: string;
      reason: string;
      referenceDocumentUri: string | null;
      changes: Array<{
        name: string;
        delta: number;
        quantityAfterChange: number;
        item: {
          id: string;
          sku: string;
        };
        location: {
          id: string;
          name: string;
        };
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
 * Tool for adjusting inventory quantities
 * @returns {Object} Inventory adjustment details
 */
const adjustInventory = {
  name: "adjust-inventory",
  description: "Adjust inventory quantities at specific locations. Use this to increase or decrease stock levels for inventory items.",
  schema: AdjustInventoryInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: AdjustInventoryInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { reason, name, changes, referenceDocumentUri } = input;

      const mutation = gql`
        mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
          inventoryAdjustQuantities(input: $input) {
            inventoryAdjustmentGroup {
              id
              reason
              referenceDocumentUri
              changes {
                name
                delta
                quantityAfterChange
                item {
                  id
                  sku
                }
                location {
                  id
                  name
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

      // Build the changes array in the format expected by the API
      const formattedChanges = changes.map(change => ({
        inventoryItemId: change.inventoryItemId,
        locationId: change.locationId,
        delta: change.delta
      }));

      const inventoryInput: {
        reason: string;
        name: string;
        changes: typeof formattedChanges;
        referenceDocumentUri?: string;
      } = {
        reason,
        name,
        changes: formattedChanges
      };

      if (referenceDocumentUri) {
        inventoryInput.referenceDocumentUri = referenceDocumentUri;
      }

      const variables = {
        input: inventoryInput
      };

      const data = (await shopifyClient.request(mutation, variables)) as InventoryAdjustQuantitiesResponse;

      if (data.inventoryAdjustQuantities.userErrors.length > 0) {
        throw new Error(
          `Failed to adjust inventory: ${data.inventoryAdjustQuantities.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.inventoryAdjustQuantities.inventoryAdjustmentGroup) {
        throw new Error("Inventory adjustment failed: No adjustment group returned");
      }

      const adjustmentGroup = data.inventoryAdjustQuantities.inventoryAdjustmentGroup;

      return {
        success: true,
        adjustmentGroup: {
          id: adjustmentGroup.id,
          reason: adjustmentGroup.reason,
          referenceDocumentUri: adjustmentGroup.referenceDocumentUri,
          changes: adjustmentGroup.changes.map(change => ({
            name: change.name,
            delta: change.delta,
            quantityAfterChange: change.quantityAfterChange,
            inventoryItem: {
              id: change.item.id,
              sku: change.item.sku
            },
            location: {
              id: change.location.id,
              name: change.location.name
            }
          }))
        }
      };
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      throw new Error(
        `Failed to adjust inventory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { adjustInventory };
