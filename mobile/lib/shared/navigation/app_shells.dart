import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants/app_routes.dart';
import '../../features/transport/presentation/pages/bus_tracking_page.dart';
import '../widgets/offline_banner.dart';

class ParentShell extends StatefulWidget {
  const ParentShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<ParentShell> createState() => _ParentShellState();
}

class _ParentShellState extends State<ParentShell> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('EDUOVA Parent')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: widget.navigationShell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: widget.navigationShell.currentIndex,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.family_restroom), label: 'Children'),
          NavigationDestination(icon: Icon(Icons.payments_outlined), label: 'Fees'),
          NavigationDestination(icon: Icon(Icons.message_outlined), label: 'Messages'),
        ],
        onDestinationSelected: (index) {
          widget.navigationShell.goBranch(
            index,
            initialLocation: index == widget.navigationShell.currentIndex,
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute<void>(
              builder: (_) => const BusTrackingPage(),
            ),
          );
        },
        label: const Text('Transport'),
        icon: const Icon(Icons.directions_bus_outlined),
      ),
    );
  }
}

class StudentShell extends StatelessWidget {
  const StudentShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('EDUOVA Student')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.analytics_outlined), label: 'Results'),
          NavigationDestination(icon: Icon(Icons.event_available), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.schedule), label: 'Timetable'),
        ],
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}

class TeacherShell extends StatelessWidget {
  const TeacherShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('EDUOVA Teacher')),
      body: Column(
        children: [
          const OfflineBanner(),
          Expanded(child: navigationShell),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.checklist_outlined), label: 'Attendance'),
          NavigationDestination(icon: Icon(Icons.grade_outlined), label: 'Gradebook'),
          NavigationDestination(icon: Icon(Icons.message_outlined), label: 'Messages'),
        ],
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
      floatingActionButton: navigationShell.currentIndex == 0
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const BusTrackingPage(),
                  ),
                );
              },
              label: const Text('Transport'),
              icon: const Icon(Icons.directions_bus_outlined),
            )
          : null,
    );
  }
}

class _BasicPage extends StatelessWidget {
  const _BasicPage({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Center(child: Text(title));
  }
}
