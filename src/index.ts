import dotenv from 'dotenv';
import { Agent, Runner, tool, OpenAIProvider } from '@openai/agents';
dotenv.config();

(async () => {
  const agent = new Agent({
    name: 'ErrorAnalysisAgent',
    instructions: `
      Bạn là chuyên gia kỹ thuật. Nhiệm vụ:
      - Nhận dữ liệu từ user (question + image)
      - Tìm mã lỗi (nếu có)
      - Nếu user hỏi nhiều mã, dùng get_error_list
      - Nếu user mô tả lỗi, dùng search_error_by_text
      - Sau khi có dữ liệu, hãy trả về câu trả lời ngắn gọn, rõ ràng.
      LƯU Ý: Tuyệt đối không tự bịa mã lỗi.
    `,
    model: process.env.ERROR_ANALYSIS_MODEL,
    tools: [
      tool({
        name: 'get_error_detail',
        description: 'Lấy chi tiết lỗi theo mã lỗi',
        parameters: {
          type: 'object',
          properties: {
            error_code: {
              type: 'string',
            },
          },
          required: ['error_code'],
          additionalProperties: false,
        },
        execute: async ({ error_code }: { error_code: string }) => {
          return await new Promise<string>((resolve) => {
            setTimeout(() => {
              resolve(`Mã lỗi: ${error_code} là mã lỗi hệ thống tạm dừng hoạt động`);
            }, 1000);
          });
        },
      }),
    ],
  });

  const runner = new Runner({
    modelProvider: new OpenAIProvider({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });

  // const result = await runner.run(agent, 'Mã lỗi 9999 là mã lỗi gì?');
  const result = await runner.run(agent, [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: 'Đây là mã lỗi gì?',
        },
        {
          type: 'input_image',
          image: 'https://files-techsupport.hpscamera.com/error-analysis/error-9999.jpg',
        },
      ],
    },
  ]);

  // Lọc các tool calls từ newItems
  const toolCalls = result.newItems.filter((item) => item.type === 'tool_call_item');

  console.log('Tools được sử dụng:');
  toolCalls.forEach((item) => {
    if (item.type === 'tool_call_item') {
      const rawItem = item.rawItem;
      if (rawItem && typeof rawItem === 'object' && 'name' in rawItem && 'arguments' in rawItem) {
        const toolName = rawItem.name;
        const toolArgs = rawItem.arguments;
        let parsedArgs: unknown;
        try {
          if (typeof toolArgs === 'string') {
            parsedArgs = JSON.parse(toolArgs);
          } else {
            parsedArgs = toolArgs;
          }
        } catch {
          parsedArgs = toolArgs;
        }
        console.log(`  - Tool: ${toolName}`);
        console.log(`    Parameters:`, parsedArgs);
      }
    }
  });

  // Lấy thông tin token usage
  const usage = result.state.usage;
  console.log('\nToken sử dụng:');
  console.log(`  - Token prompt (input): ${usage.inputTokens}`);
  console.log(`  - Token reply (output): ${usage.outputTokens}`);
  console.log(`  - Tổng token: ${usage.totalTokens}`);
  console.log(result.lastResponseId);

  console.log('\nOutput:', result.finalOutput);
})();
