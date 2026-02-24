import dotenv from 'dotenv';
dotenv.config();

import { PlaywrightCrawler } from 'crawlee';

const crawler = new PlaywrightCrawler({
  maxRequestsPerCrawl: 50,
  async requestHandler({ request, page, parseWithCheerio, pushData, enqueueLinks, log }) {
    log.info(`Crawling: ${request.loadedUrl}`);

    if (request.label === 'DETAIL') {
      await page.waitForLoadState('networkidle');
      const $ = await parseWithCheerio();
      const title = await page.title();
      const content = $('#module19 .bottom-highlight .simpleListing .row-layout .article-item:last-child').html();
      await pushData({
        title,
        content,
      });
    }
    // list page
    else {
      // wait page refresh
      await page.waitForLoadState('networkidle');
      const $ = await parseWithCheerio();
      log.info($.html());
      const title = await page.title();
      const content = $('#module14').html();

      await pushData({
        title,
        content,
      });

      await enqueueLinks({
        selector: '#module14 a',
        label: 'DETAIL',
        transformRequestFunction: (req) => {
          return {
            ...req,
            headers: {
              Referer: request.loadedUrl,
            },
            keepUrlFragment: false,
          };
        },
      });
    }
  },

  // Uncomment this option to see the browser window.
  // headless: false,
});

(async () => {
  await crawler.run(['https://tulieuvankien.dangcongsan.vn/lanh-dao-dang-nha-nuoc']);

  // const dataset = await Dataset.open();
  // const { items } = await dataset.getData();

  // console.log(items);
})();
