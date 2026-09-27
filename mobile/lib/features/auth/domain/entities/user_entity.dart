class UserEntity {
  const UserEntity({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.institutionId,
    this.studentId,
    this.studentNumber,
    this.phone,
    this.profilePhoto,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String institutionId;
  final String? studentId;
  final String? studentNumber;
  final String? phone;
  final String? profilePhoto;

  String get fullName => '$firstName $lastName'.trim();
}
