import 'package:flutter/material.dart';

import '../../../../core/constants/app_colors.dart';

class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _institutionCodeController = TextEditingController();
  final _emailController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _submitted = false;

  @override
  void dispose() {
    _institutionCodeController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Forgot Password')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Text(
                          'Reset Access',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Enter your institution code and email to receive reset instructions.',
                          style: TextStyle(color: AppColors.textMuted),
                        ),
                        const SizedBox(height: 24),
                        TextFormField(
                          controller: _institutionCodeController,
                          decoration: const InputDecoration(
                            labelText: 'Institution Code',
                          ),
                          validator: (value) =>
                              value == null || value.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _emailController,
                          decoration:
                              const InputDecoration(labelText: 'Email'),
                          validator: (value) =>
                              value == null || value.isEmpty ? 'Required' : null,
                        ),
                        const SizedBox(height: 24),
                        FilledButton(
                          onPressed: () {
                            if (_formKey.currentState!.validate()) {
                              setState(() => _submitted = true);
                            }
                          },
                          child: const Text('Send Reset Link'),
                        ),
                        if (_submitted)
                          const Padding(
                            padding: EdgeInsets.only(top: 16),
                            child: Text(
                              'If the account exists, reset instructions will be sent shortly.',
                              style: TextStyle(color: AppColors.success),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
