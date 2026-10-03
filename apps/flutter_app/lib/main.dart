import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app.dart';
import 'core/constants/api_constants.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (kReleaseMode && !ApiConstants.hasProductionBaseUrl) {
    runApp(const _ApiConfigurationRequiredApp());
    return;
  }

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  runApp(
    const ProviderScope(
      child: NexusEduApp(),
    ),
  );
}

class _ApiConfigurationRequiredApp extends StatelessWidget {
  const _ApiConfigurationRequiredApp();

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Nexus is not configured for production. Set '
              'NEXUS_API_URL to the deployed HTTPS API and rebuild.',
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }
}
