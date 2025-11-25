import './utils/config.util';
import path from 'path';
import { extractTextFromDocx } from './utils/file.util';
import { chunkText } from './utils/chunk.util';
import { v4 as uuidv4 } from 'uuid';
import { getEmbedding } from './services/openai.service';
import { ChunkModel } from './models/chunk.model';
import mongoose from 'mongoose';

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

  const now = new Date();
  const docId = uuidv4();
  const chunkDocs = [];
  for (let i = 0; i < chunksLength; i++) {
    const text = chunks[i];
    const emb = await getEmbedding(text); // sequential; you can batch if needed
    chunkDocs.push({
      docId,
      text,
      embedding: emb,
      createdAt: now,
    });
    // await ChunkModel.insertOne({
    //   docId,
    //   text,
    //   embedding: emb,
    //   createdAt: now,
    // });
    // console.log(`Saved ${i + 1}/${chunksLength}`);
  }
  await ChunkModel.insertMany(chunkDocs);
  console.log('Import done!');
  process.exit(0);
})();
