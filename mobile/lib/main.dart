import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'core/cache/hive_cache.dart';
import 'core/constants/app_colors.dart';
import 'core/constants/app_routes.dart';
import 'features/academics/presentation/pages/parent_results_page.dart';
import 'features/academics/presentation/pages/teacher_gradebook_page.dart';
import 'features/attendance/presentation/pages/parent_attendance_page.dart';
import 'features/attendance/presentation/pages/teacher_attendance_page.dart';
import 'features/auth/presentation/pages/forgot_password_page.dart';
import 'features/auth/presentation/pages/login_page.dart';
import 'features/auth/presentation/providers/auth_provider.dart';
import 'features/communication/presentation/pages/chat_page.dart';
import 'features/dashboard/presentation/pages/parent_home_page.dart';
import 'features/dashboard/presentation/pages/teacher_home_page.dart';
import 'features/finance/presentation/pages/parent_fees_page.dart';
import 'features/students/presentation/pages/children_page.dart';
import 'shared/navigation/app_shells.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  await HiveCache.init();

  runApp(const ProviderScope(child: EduovaMobileApp()));
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

      if (state.matchedLocation == AppRoutes.app) {
        switch (auth.user.role) {
          case 'parent':
            return AppRoutes.parentHome;
          case 'student':
            return AppRoutes.studentHome;
          default:
            return AppRoutes.teacherHome;
        }
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
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ParentShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.parentHome,
                builder: (context, state) => const ParentHomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.parentChildren,
                builder: (context, state) => const ChildrenPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.parentFees,
                builder: (context, state) => const ParentFeesPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.parentMessages,
                builder: (context, state) => const ChatPage(),
              ),
            ],
          ),
        ],
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
                builder: (context, state) => const _SimpleHomePage(title: 'Student Home'),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentResults,
                builder: (context, state) => const ParentResultsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentAttendance,
                builder: (context, state) => const ParentAttendancePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.studentTimetable,
                builder: (context, state) =>
                    const _SimpleHomePage(title: 'Student Timetable'),
              ),
            ],
          ),
        ],
      ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return TeacherShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.teacherHome,
                builder: (context, state) => const TeacherHomePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.teacherAttendance,
                builder: (context, state) => const TeacherAttendancePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.teacherGradebook,
                builder: (context, state) => const TeacherGradebookPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.teacherMessages,
                builder: (context, state) => const ChatPage(),
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

class _SimpleHomePage extends StatelessWidget {
  const _SimpleHomePage({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text(title)),
    );
  }
}
