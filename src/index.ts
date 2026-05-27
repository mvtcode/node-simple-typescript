import { PlaywrightCrawler } from 'crawlee';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const questionid = 70007;

async function main() {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question('Nhập số lượng vote: ');
    const voteCount = parseInt(answer.trim(), 10);

    if (isNaN(voteCount) || voteCount <= 0) {
      console.log('Số lượng vote không hợp lệ! Vui lòng nhập một số nguyên dương.');
      return;
    }

    console.log(`Bắt đầu thực hiện ${voteCount} lượt vote...`);

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: voteCount,
      requestHandlerTimeoutSecs: 60,
      // maxConcurrency giúp kiểm soát số lượng browser mở song song để tránh quá tải RAM/CPU.
      // Bạn có thể tùy chỉnh giá trị này (ví dụ: 1, 2, 3...)
      maxConcurrency: 2,

      async requestHandler({ request, page, parseWithCheerio, log }) {
        const index = request.userData.index + 1;
        log.info(`[Lượt ${index}/${voteCount}] Đang mở url: ${request.loadedUrl}`);

        await page.waitForLoadState('domcontentloaded');
        const $ = await parseWithCheerio();
        log.info(`[Lượt ${index}/${voteCount}] Tải trang thành công!`);

        const radioButtons = $(
          `#vote-${questionid} .wrap_answer .item_row_bx .label_check`
        ).toArray();

        for (const divLabel of radioButtons) {
          const text = $(divLabel).find('.text_ans').text().trim();
          const value = String($(divLabel).find('input').val() || '');

          if (text.toLocaleLowerCase().includes('không muốn')) {
            log.info(`[Lượt ${index}/${voteCount}] Chọn phương án: "${text}" (Value: ${value})`);

            await page
              .locator(`#vote-${questionid} input[value="${value}"]`)
              .click({ force: true });
            await page.waitForTimeout(500);
            await page.click(`#btn_add_vote_${questionid}`);
            await page.waitForTimeout(1000);

            log.info(`[Lượt ${index}/${voteCount}] Vote thành công!`);
            return; // Trả về để Crawlee tiếp tục request tiếp theo, không sử dụng process.exit(0)
          }
        }
      },
    });

    // Tạo danh sách các request với uniqueKey khác nhau
    // để tránh việc Crawlee tự động lọc trùng các URL giống nhau.
    const requests = Array.from({ length: voteCount }, (_, i) => ({
      url: 'https://vnexpress.net/nguoi-tieu-dung-dan-coi-mo-voi-xang-sinh-hoc-e10-5074369.html',
      uniqueKey: `vote-${i}-${Date.now()}`,
      userData: { index: i },
    }));

    await crawler.run(requests);
    console.log(`\nChúc mừng! Đã hoàn thành toàn bộ ${voteCount} lượt vote!`);
  } catch (error) {
    console.error('Đã xảy ra lỗi trong quá trình thực hiện:', error);
  } finally {
    rl.close();
  }
}

main();
