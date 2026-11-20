import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/cache/hive_cache.dart';
import 'core/constants/app_colors.dart';
import 'core/constants/app_routes.dart';
import 'features/academics/presentation/pages/student_courses_page.dart';
import 'features/auth/presentation/pages/forgot_password_page.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/dashboard/presentation/pages/student_home_page.dart';
import 'features/finance/presentation/pages/student_finance_page.dart';
import 'features/learning/presentation/pages/student_learning_page.dart';
import 'features/students/presentation/pages/student_profile_page.dart';
import 'shared/navigation/app_shells.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
  } catch (error) {
    debugPrint('Firebase is unavailable, continuing without push setup: $error');
  }
  await HiveCache.init();

  runApp(const ProviderScope(child: EduovaMobileApp()));
}

bool _isTertiaryStudent(String role) {
  final normalized = role.toLowerCase();
  return normalized == 'student' || normalized == 'tertiary_student';
}

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    redirect: (context, state) {
      final isAuthPage = state.matchedLocation == AppRoutes.login ||
          state.matchedLocation == AppRoutes.forgotPassword;
      final auth = authState.valueOrNull;

      if (auth == null) {
        return isAuthPage ? null : AppRoutes.login;
      }

      final location = state.matchedLocation;
      final isStudent = _isTertiaryStudent(auth.user.role);

      if (!isStudent) {
        return location == AppRoutes.tertiaryOnly ? null : AppRoutes.tertiaryOnly;
      }
      if (location == AppRoutes.tertiaryOnly ||
          location.startsWith('/app/parent') ||
          location.startsWith('/app/teacher')) {
        return AppRoutes.studentHome;
      }

      if (location == AppRoutes.app) {
        return AppRoutes.studentHome;
      }

      if (isAuthPage) {
        return AppRoutes.app;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: AppRoutes.forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: AppRoutes.app,
        builder: (context, state) => const _LaunchGatePage(),
      ),
      GoRoute(
        path: AppRoutes.tertiaryOnly,
        builder: (context, state) => const _TertiaryOnlyPage(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return StudentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentHome,
                builder: (context, state) => const StudentHomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentLearning,
                builder: (context, state) => const StudentLearningPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentCourses,
                builder: (context, state) => const StudentCoursesPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentFinance,
                builder: (context, state) => const StudentFinancePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentProfile,
                builder: (context, state) => const StudentProfilePage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class EduovaMobileApp extends ConsumerWidget {
  const EduovaMobileApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: 'EDUOVA',
      routerConfig: router,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          primary: AppColors.primary,
          secondary: AppColors.accent,
          background: AppColors.background,
          surface: AppColors.surface,
          error: AppColors.error,
        ),
        scaffoldBackgroundColor: AppColors.background,
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
      ),
    );
  }
}

class _TertiaryOnlyPage extends ConsumerWidget {
  const _TertiaryOnlyPage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'This app is for tertiary students.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 12),
              const Text(
                'Parents use the basic education app. Sign in with a tertiary student account to open courses, learning, finance, and results.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    context.go(AppRoutes.login);
                  }
                },
                child: const Text('Sign out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LaunchGatePage extends ConsumerWidget {
  const _LaunchGatePage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    if (auth == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return const SizedBox.shrink();
  }
}
