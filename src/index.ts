import dotenv from 'dotenv';
dotenv.config();
import amqp from 'amqplib';

const RABBITMQ_URI = process.env.RABBITMQ_URI!;
const QUEUE = 'tan_test';
const isRetry = false;

(async () => {
  const connection = await amqp.connect(RABBITMQ_URI);
  connection.on('error', (err) => {
    console.error('❌ Channel error:', err.message);
  });

  connection.on('close', () => {
    console.warn('⚠️ AMQP connection closed');
    // reconnect ở đây
    // console.log('🔁 Reconnecting...');
    // setTimeout(connect, 5000);
  });
  connection.on('blocked', (reason) => {
    console.warn('🚫 Connection blocked:', reason);
  });
  connection.on('unblocked', () => {
    console.log('✅ Connection unblocked');
  });
  connection.on('return', (msg) => {
    console.warn('↩️ Message returned:', msg.content.toString());
  });

  const consumer = await connection.createChannel();
  await consumer.assertQueue(QUEUE, { durable: false });

  // consummer
  consumer.consume(
    QUEUE,
    (msg: amqp.Message | null) => {
      if (!msg) return;
      try {
        console.log('Received:', msg.content.toString());
        // xử lý thành công
        consumer.ack(msg);
      } catch (error) {
        console.error('Error processing message:', error);
        // xử lý thất bại
        consumer.reject(msg, isRetry);

        // hoặc sử dụng
        // if (isRetry) {
        //   consumer.nack(msg, false, true); // retry
        // } else {
        //   consumer.nack(msg, false, false); // DLQ / drop
        // }
      }
    },
    { noAck: false }
  );

  // publisher
  const publisher = await connection.createChannel();
  setInterval(() => {
    publisher.sendToQueue(QUEUE, Buffer.from('something to do'));
  }, 1000);

  process.on('SIGINT', () => {
    console.log('Closing connection...');
    consumer.close();
    publisher.close();
    connection.close();
    process.exit(0);
  });
})();
