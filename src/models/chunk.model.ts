// src/models/Chunk.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IChunkDocument extends Document {
  docId: string;
  text: string;
  embedding: number[]; // vector
  createdAt: Date;
}

const ChunkSchema = new Schema<IChunkDocument>(
  {
    docId: { type: String, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    createdAt: { type: Date },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: 'rag-chunks',
  }
);

// Tạo index nếu cần
ChunkSchema.index({ docId: 1 });

export const ChunkModel = mongoose.model<IChunkDocument>('chunks', ChunkSchema);
