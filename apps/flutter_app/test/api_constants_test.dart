import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_edu/core/constants/api_constants.dart';

void main() {
  group('isSafeProductionBaseUrl', () {
    test('accepts an HTTPS host without embedded credentials or query data',
        () {
      expect(
        ApiConstants.isSafeProductionBaseUrl('https://api.nexus.invalid/api'),
        isTrue,
      );
    });

    test('rejects non-HTTPS and local-network endpoints', () {
      for (final url in [
        'http://api.nexus.invalid/api',
        'https://localhost/api',
        'https://10.0.2.2:4000/api',
        'https://192.168.1.20/api',
        'https://172.20.1.3/api',
        'https://[fe80::1]/api',
        'https://user:pass@api.nexus.invalid/api',
        'https://api.nexus.invalid/api?token=secret',
      ]) {
        expect(ApiConstants.isSafeProductionBaseUrl(url), isFalse, reason: url);
      }
    });
  });
}
