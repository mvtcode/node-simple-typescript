import dotenv from 'dotenv';
dotenv.config();
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { ContentBlock, ImageBlock, ProcessedImage } from './types';
import { uploadToR2 } from './utils/r2-upload';
import { analyzeImage, parseImageBlock } from './utils/image-processor';

// Global array to collect blocks in order
const blocks: ContentBlock[] = [];

/**
 * Main function to convert DOCX to Markdown
 */
async function main() {
  console.log('🚀 Starting DOCX to Markdown conversion...\n');

  // Validate environment variables
  // const config = validateEnvironment();

  // Input and output paths
  const inputPath = join(__dirname, '../docs/Mongodb Cloud RAG.docx');
  const outputDir = join(__dirname, '../output');
  const outputPath = join(outputDir, `output-${Date.now()}.md`);

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Step 1: Parse DOCX with Mammoth
  console.log('📄 Parsing DOCX file...');
  await parseDocx(inputPath);
  console.log(`✅ Found ${blocks.length} content blocks\n`);

  // Step 2: Process blocks and generate Markdown
  console.log('🔄 Processing blocks...');
  const markdown = await processBlocks(blocks);

  // Step 3: Save output
  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`\n✅ Markdown file saved to: ${outputPath}`);
}

/**
 * Parse DOCX file and collect blocks in order
 */
async function parseDocx(filePath: string): Promise<void> {
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement(function (element) {
        return element.read().then(function (imageBuffer: Buffer) {
          // Add image block to our collection
          blocks.push({
            type: 'image',
            imageBuffer: imageBuffer,
            contentType: element.contentType || null,
          });
          // Return empty src to prevent inline base64
          return { src: '' };
        });
      }),
    }
  );

  const html = result.value;

  // Convert HTML to text blocks and insert them in order
  // We need to split the HTML and insert text blocks between images
  const textBlocks = splitHtmlIntoBlocks(html);

  // Merge text and image blocks in correct order
  mergeBlocks(textBlocks);
}

/**
 * Split HTML into text blocks
 */
function splitHtmlIntoBlocks(html: string): string[] {
  // Split by empty image tags (which we inserted as placeholders)
  const parts = html.split(/<img[^>]*>/);
  return parts;
}

/**
 * Merge text and image blocks in correct order
 */
function mergeBlocks(textParts: string[]): void {
  const mergedBlocks: ContentBlock[] = [];
  let imageIndex = 0;

  for (let i = 0; i < textParts.length; i++) {
    const textContent = textParts[i].trim();

    // Add text block if not empty
    if (textContent) {
      mergedBlocks.push({
        type: 'text',
        content: textContent,
      });
    }

    // Add image block if available
    if (i < textParts.length - 1) {
      const imageBlock = blocks.filter((b) => b.type === 'image')[imageIndex];
      if (imageBlock) {
        mergedBlocks.push(imageBlock);
        imageIndex++;
      }
    }
  }

  // Replace global blocks with merged version
  blocks.length = 0;
  blocks.push(...mergedBlocks);
}

/**
 * Process all blocks and generate Markdown
 */
async function processBlocks(
  contentBlocks: ContentBlock[],
): Promise<string> {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  let markdown = '';
  const totalBlocks = contentBlocks.length;

  for (let i = 0; i < contentBlocks.length; i++) {
    const block = contentBlocks[i];
    console.log(
      `  Processing block ${i + 1}/${totalBlocks} (${block.type})...`
    );

    if (block.type === 'text') {
      // Convert HTML to Markdown
      const md = turndown.turndown(block.content);
      markdown += md + '\n\n';
    } else if (block.type === 'image') {
      // Process image block
      const processedImage = await processImageBlock(
        block,
        contentBlocks,
        i,
      );
      markdown += formatImageMarkdown(processedImage);
    }
  }

  return markdown.trim();
}

/**
 * Process a single image block
 */
async function processImageBlock(
  imageBlock: ImageBlock,
  allBlocks: ContentBlock[],
  currentIndex: number,
): Promise<ProcessedImage> {
  // Step 1: Upload to R2
  console.log('    📤 Uploading to R2...');
  const imageUrl = await uploadToR2(
    imageBlock.imageBuffer,
    imageBlock.contentType,
  );
  console.log(`    ✅ Uploaded: ${imageUrl}`);

  // Step 2: Get context (needed for image analysis)
  const contextBefore = getContext(allBlocks, currentIndex, -1);
  const contextAfter = getContext(allBlocks, currentIndex, 1);
  const combinedContext = [contextBefore, contextAfter]
    .filter(Boolean)
    .join('\n\n---\n\n');

  // Step 3: Analyze image with LLM (OCR + Description in 1 call)
  console.log('    🔍 Analyzing image with LLM...');
  const analysisResult = await analyzeImage(imageUrl, combinedContext);
  const { description, ocrText } = parseImageBlock(analysisResult);
  console.log(`    ✅ OCR extracted ${ocrText.length} lines`);
  console.log('    ✅ Description generated');

  return {
    url: imageUrl,
    description,
    ocrText,
  };
}

/**
 * Get context text before or after current block
 */
function getContext(
  blocks: ContentBlock[],
  currentIndex: number,
  direction: -1 | 1
): string {
  const targetIndex = currentIndex + direction;

  if (targetIndex < 0 || targetIndex >= blocks.length) {
    return '';
  }

  const block = blocks[targetIndex];
  if (block.type === 'text') {
    // Convert HTML to plain text (simple approach)
    const plainText = block.content.replace(/<[^>]*>/g, ' ').trim();
    // Limit to 500 characters
    return plainText.substring(0, 500);
  }

  return '';
}

/**
 * Format processed image as Markdown
 */
function formatImageMarkdown(image: ProcessedImage): string {
  let md = `![Hình ảnh](${image.url})\n\n`;

  md += `**Mô tả hình ảnh:**  \n${image.description}\n\n`;

  if (image.ocrText.length > 0) {
    md += `**Văn bản trong ảnh (OCR):**\n`;
    for (const line of image.ocrText) {
      md += `- ${line}\n`;
    }
    md += '\n';
  }

  return md;
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

