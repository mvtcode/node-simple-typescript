import dotenv from 'dotenv';
dotenv.config();
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import mammoth from 'mammoth';
import TurndownService from 'turndown';
import { v4 as uuidv4 } from 'uuid';
import { ContentBlock, ImageBlock } from './types';
import { uploadToR2 } from './utils/r2-upload';
import { analyzeImage, parseImageBlock } from './utils/image-processor';

const docId = uuidv4();

/**
 * Main function to convert DOCX to Markdown
 */
async function main() {
  console.log('🚀 Bắt đầu quy trình chuyển đổi DOCX sang Markdown (Pro version)...\n');

  const inputPath = join(__dirname, '../docs/Mongodb Cloud RAG.docx');
  const outputDir = join(__dirname, '../output');
  const outputPath = join(outputDir, `output-${Date.now()}.md`);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Bước 1: Parse DOCX và lấy danh sách blocks theo đúng thứ tự
  console.log('📄 Đang phân tích file DOCX...');
  const blocks = await parseDocxToBlocks(inputPath);
  console.log(`✅ Tìm thấy ${blocks.length} blocks nội dung.\n`);

  // Bước 2: Xử lý blocks và tạo Markdown
  console.log('🔄 Đang xử lý AI Analysis cho hình ảnh và chuyển đổi định dạng...');
  const markdown = await generateMarkdown(blocks);

  // Bước 3: Lưu file
  writeFileSync(outputPath, markdown, 'utf-8');
  console.log(`\n✅ Thành công! File Markdown đã được lưu tại: ${outputPath}`);
}

/**
 * Phân tích DOCX thành mảng ContentBlock có thứ tự chính xác bằng UUID placeholder
 */
async function parseDocxToBlocks(filePath: string): Promise<ContentBlock[]> {
  const imageMap = new Map<string, { buffer: Buffer; contentType: string }>();

  // Dùng Mammoth để convert sang HTML, đồng thời thay ảnh bằng UUID marker
  const result = await mammoth.convertToHtml(
    { path: filePath },
    {
      convertImage: mammoth.images.imgElement((element) => {
        return element.read().then((imageBuffer) => {
          const imgId = uuidv4();
          imageMap.set(imgId, {
            buffer: imageBuffer,
            contentType: element.contentType || 'image/png'
          });
          // Trả về thẻ img với src là ID duy nhất để dễ dàng split
          return { src: `IMAGE_PLACEHOLDER_${imgId}` };
        });
      }),
    }
  );

  const html = result.value;
  const blocks: ContentBlock[] = [];

  // Chia nhỏ HTML dựa trên các marker ảnh
  const parts = html.split(/(<img src="IMAGE_PLACEHOLDER_[^"]+" \/>)/);

  for (const part of parts) {
    const match = part.match(/IMAGE_PLACEHOLDER_([a-f0-9-]{36})/);
    if (match) {
      const id = match[1];
      const imgData = imageMap.get(id);
      if (imgData) {
        blocks.push({
          type: 'image',
          imageBuffer: imgData.buffer,
          contentType: imgData.contentType,
        } as ImageBlock);
      }
    } else {
      const textContent = part.trim();
      if (textContent) {
        blocks.push({
          type: 'text',
          content: textContent,
        });
      }
    }
  }

  return blocks;
}

/**
 * Tạo Markdown từ danh sách blocks, tích hợp Heading Context
 */
async function generateMarkdown(contentBlocks: ContentBlock[]): Promise<string> {
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  let fullMarkdown = '';
  let currentHeading = 'Tổng quan'; // Mặc định nếu chưa tìm thấy heading nào

  for (let i = 0; i < contentBlocks.length; i++) {
    const block = contentBlocks[i];

    if (block.type === 'text') {
      const md = turndown.turndown(block.content);

      // Theo dõi Heading hiện tại để làm context cho ảnh phía sau
      const headingMatch = md.match(/^#+\s+(.*)$/m);
      if (headingMatch) {
        currentHeading = headingMatch[1];
      }

      fullMarkdown += md + '\n\n';
    }
    else if (block.type === 'image') {
      console.log(`  📸 Đang xử lý ảnh thứ ${i + 1}...`);

      // Lấy context xung quanh (Heading + 1 đoạn text trước/sau)
      const contextBefore = getSimpleTextContext(contentBlocks, i, -1);
      const contextAfter = getSimpleTextContext(contentBlocks, i, 1);
      const combinedContext = `Heading: ${currentHeading}\n\nNội dung trước: ${contextBefore}\n\nNội dung sau: ${contextAfter}`;

      // Upload R2
      const imageUrl = await uploadToR2(docId, block.imageBuffer, block.contentType);

      // Gọi LLM Analysis
      const analysisResult = await analyzeImage(imageUrl, combinedContext);
      const { description, ocrText } = parseImageBlock(analysisResult);

      // Format nội dung ảnh vào Markdown
      fullMarkdown += `![Hình ảnh](${imageUrl})\n\n`;
      fullMarkdown += `**Mô tả hình ảnh:**\n${description}\n\n`;

      if (ocrText.length > 0) {
        fullMarkdown += `**Văn bản trong ảnh (OCR):**\n${ocrText.map(t => `- ${t}`).join('\n')}\n\n`;
      }
    }
  }

  return fullMarkdown.trim();
}

/**
 * Helper lấy text thuần túy xung quanh block hiện tại
 */
function getSimpleTextContext(blocks: ContentBlock[], idx: number, offset: number): string {
  const target = blocks[idx + offset];
  if (target && target.type === 'text') {
    return target.content.replace(/<[^>]*>/g, ' ').substring(0, 300).trim();
  }
  return '';
}

main().catch((error) => {
  console.error('❌ Lỗi hệ thống:', error.message);
  process.exit(1);
});