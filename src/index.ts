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
  const result = await runner.run(
    agent,
    [
      {
        role: 'user',
        content: 'Xin chào',
      },
      {
        role: 'assistant',
        content: [
          {
            type: 'output_text',
            text: 'Xin chào bạn, tôi có thể giúp gì được cho bạn?',
          },
        ],
      },
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
    ],
    {
      stream: true,
      maxTurns: 3,
    }
  );

  // stream
  //   .toTextStream({
  //     compatibleWithNodeStreams: true,
  //   })
  //   .pipe(process.stdout);

  for await (const event of result) {
    // // these are the raw events from the model
    // if (event.type === 'raw_model_stream_event') {
    //   console.log(event.type, event.data.type, event.data.delta);
    // }
    // // agent updated events
    // if (event.type === 'agent_updated_stream_event') {
    //   console.log(`${event.type} %s`, event.agent.name);
    // }
    // // Agent SDK specific events
    // if (event.type === 'run_item_stream_event') {
    //   console.log(`${event.type} %o`, event.item);
    // }
    switch (event.type) {
      case 'agent_updated_stream_event':
        break;
      case 'raw_model_stream_event':
        switch (event.data.type) {
          case 'output_text_delta':
            // console.log('delta:', event.data.delta);
            process.stdout.write(event.data.delta);
            break;
          // case 'response_started':
          //   console.log('response_started:', event.data);
          //   break;
          // case 'response_done':
          //   console.log('response_started:', event.data);
          //   break;
        }
        break;
      case 'run_item_stream_event':
        switch (event.item.type) {
          case 'tool_call_item':
            // const rawItem: any = event.item.rawItem;
            console.log(
              'tool_call_item',
              (event.item.rawItem as any).name,
              (event.item.rawItem as any).arguments
            );
            break;
          case 'tool_call_output_item':
            // const rawItem: any = event.item.rawItem;
            console.log('tool_call_output_item', (event.item.rawItem as any).output);
            break;
        }
        break;
      default:
    }
  }

  await result.completed;

  // Lấy thông tin token usage
  const usage = result.state.usage;
  console.log('\nToken sử dụng:');
  console.log(`  - Token prompt (input): ${usage.inputTokens}`);
  console.log(`  - Token reply (output): ${usage.outputTokens}`);
  console.log(`  - Tổng token: ${usage.totalTokens}`);
  console.log(result.lastResponseId);

  console.log('\nOutput:', result.finalOutput);
})();
