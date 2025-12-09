import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for createFile
const CreateFileInputSchema = z.object({
  files: z.array(z.object({
    alt: z.string().optional().describe("Alt text for the file (for images)"),
    contentType: z.enum([
      "FILE",
      "IMAGE",
      "VIDEO"
    ]).optional().describe("The content type of the file"),
    filename: z.string().optional().describe("The filename to use for the file"),
    originalSource: z.string().min(1).describe("The URL of the file to upload. Must be a publicly accessible URL.")
  })).min(1).describe("Array of files to create/upload")
});

type CreateFileInput = z.infer<typeof CreateFileInputSchema>;

interface FileCreateResponse {
  fileCreate: {
    files: Array<{
      id: string;
      alt: string | null;
      createdAt: string;
      fileStatus: string;
      preview: {
        image: {
          url: string;
        } | null;
      } | null;
      // MediaImage fields
      image?: {
        url: string;
        width: number;
        height: number;
      };
      // GenericFile fields
      url?: string;
      mimeType?: string;
      // Video fields
      sources?: Array<{
        url: string;
        mimeType: string;
        format: string;
        height: number;
        width: number;
      }>;
    }> | null;
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
 * Tool for uploading files (images, videos, documents) to Shopify
 * @returns {Object} Created file details
 */
const createFile = {
  name: "create-file",
  description: "Upload files (images, videos, documents) to Shopify's file storage. Files can then be used in products, pages, and other content. Provide a publicly accessible URL for the file to upload.",
  schema: CreateFileInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateFileInput) => {
    if (!shopifyClient) {
      throw new Error("GraphQL client not initialized. Call initialize() first.");
    }
    try {
      const { files } = input;

      const mutation = gql`
        mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              alt
              createdAt
              fileStatus
              preview {
                image {
                  url
                }
              }
              ... on MediaImage {
                image {
                  url
                  width
                  height
                }
              }
              ... on GenericFile {
                url
                mimeType
              }
              ... on Video {
                sources {
                  url
                  mimeType
                  format
                  height
                  width
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

      const variables = {
        files: files.map(file => ({
          alt: file.alt,
          contentType: file.contentType,
          filename: file.filename,
          originalSource: file.originalSource
        }))
      };

      const data = (await shopifyClient.request(mutation, variables)) as FileCreateResponse;

      if (data.fileCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create file(s): ${data.fileCreate.userErrors
            .map((error) => `${error.message} (${error.code})`)
            .join(", ")}`
        );
      }

      if (!data.fileCreate.files || data.fileCreate.files.length === 0) {
        throw new Error("File creation failed: No files returned");
      }

      return {
        success: true,
        files: data.fileCreate.files.map(file => ({
          id: file.id,
          alt: file.alt,
          createdAt: file.createdAt,
          fileStatus: file.fileStatus,
          preview: file.preview,
          image: file.image,
          url: file.url,
          mimeType: file.mimeType,
          sources: file.sources
        }))
      };
    } catch (error) {
      console.error("Error creating file:", error);
      throw new Error(
        `Failed to create file: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createFile };
