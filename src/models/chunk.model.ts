import mongoose, { Schema, Document } from 'mongoose';
import { IChunk } from '../interfaces/chunk.interface';

export interface IChunkDocument extends IChunk, Document {}

const ChunkSchema = new Schema<IChunkDocument>(
  {
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
  },
  {
    versionKey: false,
    timestamps: true,
    collection: 'rag',
  }
);

export const ChunkModel = mongoose.model<IChunkDocument>('chunks', ChunkSchema);
