import './utils/config.util';
import path from 'path';
import { extractTextFromDocx } from './utils/file.util';
import { chunkText } from './utils/chunk.util';
import { getEmbedding } from './services/openai.service';
import { v4 as uuidv4 } from 'uuid';
import { RedisClient } from './services/redis.service';

(async () => {
  const redisClient = RedisClient.getInstance();
  await redisClient.connect();
  await redisClient.createVectorIndex();

  console.log('Read file...');
  const docFilePath = path.join(__dirname, '..', 'docs/huong_dan_may_tinh_windows_co_ban.docx');
  const docContent = await extractTextFromDocx(docFilePath);
  console.log('Read file done', docContent.length);

  console.log('Progress chunks...');
  const chunks = chunkText(docContent, 250, 50);
  console.log('Total chunks', chunks.length);

  const docId = uuidv4();
  for (const [index, text] of chunks.entries()) {
    const emb = await getEmbedding(text); // sequential; you can batch if needed
    await redisClient.addDocument(docId, index, text, emb, { source: docFilePath });
  }
  console.log('Import done!');
  process.exit(0);
})();
