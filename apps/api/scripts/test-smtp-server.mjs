import { SMTPServer } from 'smtp-server';

const expectedUser = process.env.SMTP_USER;
const expectedPassword = process.env.SMTP_PASS;
const port = Number(process.env.SMTP_PORT || 2525);

if (!expectedUser || !expectedPassword || !Number.isInteger(port)) {
  throw new Error('The test SMTP sink requires SMTP_USER, SMTP_PASS, and a valid SMTP_PORT.');
}

const server = new SMTPServer({
  authOptional: false,
  allowInsecureAuth: true,
  disabledCommands: ['STARTTLS'],
  onAuth(auth, _session, callback) {
    if (auth.username !== expectedUser || auth.password !== expectedPassword) {
      callback(new Error('Invalid test SMTP credentials.'));
      return;
    }
    callback(null, { user: auth.username });
  },
  onData(stream, _session, callback) {
    stream.on('error', callback);
    stream.on('end', () => callback(null, 'Message accepted by the CI-only SMTP sink.'));
    stream.resume();
  },
});

server.listen(port, '127.0.0.1');
server.on('error', (error) => {
  console.error('CI SMTP sink failed to start:', error.message);
  process.exitCode = 1;
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
