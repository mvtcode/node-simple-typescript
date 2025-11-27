import './utils/config.util';
import path from 'path';
import { extractTextFromDocx } from './utils/file.util';
import { chunkText } from './utils/chunk.util';
import { getEmbedding } from './services/openai.service';
import mongoose from 'mongoose';
import { insertChunks } from './services/chunk.service';
import { IChunk } from './interfaces/chunk.interface';

(async () => {
  mongoose.set('debug', true);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rag');
  console.log('Connected database');

  console.log('Read file...');
  const docFilePath = path.join(__dirname, '..', 'docs/huong_dan_may_tinh_windows_co_ban.docx');
  const docContent = await extractTextFromDocx(docFilePath);
  console.log('Read file done', docContent.length);

  console.log('Progress chunks...');
  const chunks = chunkText(docContent, 250, 50);
  const chunksLength = chunks.length;
  console.log('Total chunks', chunksLength);

  const chunkDocs: IChunk[] = [];
  for (const content of chunks) {
    const emb = await getEmbedding(content); // sequential; you can batch if needed
    chunkDocs.push({
      content,
      embedding: emb,
    });
  }
  await insertChunks(chunkDocs);
  console.log('Import done!');
  process.exit(0);
})();
