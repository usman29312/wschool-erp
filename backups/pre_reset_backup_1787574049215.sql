-- Waseem Science & Commerce Academy ERP SQL Backup
-- Generated on: 2026-08-24T12:20:48.985Z
-- Database: wschool

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `academic_years`;
CREATE TABLE `academic_years` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year_name` varchar(255) NOT NULL,
  `status` enum('active','inactive') NOT NULL DEFAULT 'inactive',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `year_name` (`year_name`),
  UNIQUE KEY `year_name_2` (`year_name`),
  UNIQUE KEY `year_name_3` (`year_name`),
  UNIQUE KEY `year_name_4` (`year_name`),
  UNIQUE KEY `year_name_5` (`year_name`),
  UNIQUE KEY `year_name_6` (`year_name`),
  UNIQUE KEY `year_name_7` (`year_name`),
  UNIQUE KEY `year_name_8` (`year_name`),
  UNIQUE KEY `year_name_9` (`year_name`),
  UNIQUE KEY `year_name_10` (`year_name`),
  UNIQUE KEY `year_name_11` (`year_name`),
  UNIQUE KEY `year_name_12` (`year_name`),
  UNIQUE KEY `year_name_13` (`year_name`),
  UNIQUE KEY `year_name_14` (`year_name`),
  UNIQUE KEY `year_name_15` (`year_name`),
  UNIQUE KEY `year_name_16` (`year_name`),
  UNIQUE KEY `year_name_17` (`year_name`),
  UNIQUE KEY `year_name_18` (`year_name`),
  UNIQUE KEY `year_name_19` (`year_name`),
  UNIQUE KEY `year_name_20` (`year_name`),
  UNIQUE KEY `year_name_21` (`year_name`),
  UNIQUE KEY `year_name_22` (`year_name`),
  UNIQUE KEY `year_name_23` (`year_name`),
  UNIQUE KEY `year_name_24` (`year_name`),
  UNIQUE KEY `year_name_25` (`year_name`),
  UNIQUE KEY `year_name_26` (`year_name`),
  UNIQUE KEY `year_name_27` (`year_name`),
  UNIQUE KEY `year_name_28` (`year_name`),
  UNIQUE KEY `year_name_29` (`year_name`),
  UNIQUE KEY `year_name_30` (`year_name`),
  UNIQUE KEY `year_name_31` (`year_name`),
  UNIQUE KEY `year_name_32` (`year_name`),
  UNIQUE KEY `year_name_33` (`year_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `academic_years` VALUES 
(1, '2026-2027', 'active', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:50:25 GMT+0500 (Pakistan Standard Time)'),
(2, '2027-2028', 'inactive', 'Wed Jun 24 2026 03:50:19 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:50:25 GMT+0500 (Pakistan Standard Time)');

DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `status` enum('Present','Absent','Leave') NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `student_id` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `teacher_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendance_student_id_date_academic_year_id` (`student_id`,`date`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `attendance_ibfk_121` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_ibfk_122` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_ibfk_123` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `attendance_ibfk_124` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `attendance` VALUES 
(1, '2026-06-23', 'Leave', 'Wed Jun 24 2026 02:18:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:39:04 GMT+0500 (Pakistan Standard Time)', 1, 4, 1, 1),
(2, '2026-06-23', 'Absent', 'Wed Jun 24 2026 02:22:37 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:39:04 GMT+0500 (Pakistan Standard Time)', 3, 4, 1, 1),
(3, '2026-06-23', 'Present', 'Wed Jun 24 2026 02:22:37 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:22:37 GMT+0500 (Pakistan Standard Time)', 2, 4, 1, 1),
(4, '2026-06-23', 'Present', 'Wed Jun 24 2026 02:22:37 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:39:04 GMT+0500 (Pakistan Standard Time)', 4, 4, 1, 1),
(5, '2026-06-23', 'Present', 'Wed Jun 24 2026 02:22:37 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:39:04 GMT+0500 (Pakistan Standard Time)', 6, 4, 1, 1),
(6, '2026-06-24', 'Absent', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 2, 4, 1, 1),
(7, '2026-06-24', 'Leave', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 3, 4, 1, 1),
(8, '2026-06-24', 'Present', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 4, 4, 1, 1),
(9, '2026-06-24', 'Present', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 1, 4, 1, 1),
(10, '2026-06-24', 'Present', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:53:50 GMT+0500 (Pakistan Standard Time)', 6, 4, 1, 1),
(11, '2026-08-23', 'Present', 'Sun Aug 23 2026 21:57:00 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:57:00 GMT+0500 (Pakistan Standard Time)', 11, 5, 3, 1),
(12, '2026-08-23', 'Present', 'Sun Aug 23 2026 21:57:00 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:57:00 GMT+0500 (Pakistan Standard Time)', 12, 5, 3, 1),
(13, '2026-08-23', 'Absent', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 2, 4, 1, 1),
(14, '2026-08-23', 'Present', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 3, 4, 1, 1),
(15, '2026-08-23', 'Present', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 4, 4, 1, 1),
(16, '2026-08-23', 'Absent', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 8, 4, 1, 1),
(17, '2026-08-23', 'Leave', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 1, 4, 1, 1),
(18, '2026-08-23', 'Present', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:46:28 GMT+0500 (Pakistan Standard Time)', 6, 4, 1, 1);

DROP TABLE IF EXISTS `classes`;
CREATE TABLE `classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `class_name` varchar(255) NOT NULL,
  `section` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `classes_class_name_section` (`class_name`,`section`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `classes` VALUES 
(1, 'Playgroup', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(2, 'Nursery', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(3, 'Prep', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(4, 'Class 1', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(5, 'Class 2', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(6, 'Class 3', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(7, 'Class 4', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(8, 'Class 5', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(9, 'Class 6', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(10, 'Class 7', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(11, 'Class 8', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(12, 'Class 9', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(13, 'Class 10', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(14, 'Class 11', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)'),
(15, 'Class 12', 'A', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:02:46 GMT+0500 (Pakistan Standard Time)');

DROP TABLE IF EXISTS `fee_payments`;
CREATE TABLE `fee_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `payment_method` varchar(255) NOT NULL DEFAULT 'Cash',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `fee_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fee_id` (`fee_id`),
  CONSTRAINT `fee_payments_ibfk_1` FOREIGN KEY (`fee_id`) REFERENCES `fees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `fee_payments` VALUES 
(1, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 17:27:46 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:27:46 GMT+0500 (Pakistan Standard Time)', 13),
(2, '1200.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 17:28:02 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:28:02 GMT+0500 (Pakistan Standard Time)', 11),
(3, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 17:28:20 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:28:20 GMT+0500 (Pakistan Standard Time)', 15),
(4, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 17:29:02 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:29:02 GMT+0500 (Pakistan Standard Time)', 12),
(5, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 20:39:39 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:39:39 GMT+0500 (Pakistan Standard Time)', 14),
(6, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 20:39:49 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:39:49 GMT+0500 (Pakistan Standard Time)', 16),
(7, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 21:32:46 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:32:46 GMT+0500 (Pakistan Standard Time)', 17),
(8, '1500.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 21:33:02 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:33:02 GMT+0500 (Pakistan Standard Time)', 17),
(9, '3000.00', '2026-08-23', 'Cash', '', 'Sun Aug 23 2026 21:33:13 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:33:13 GMT+0500 (Pakistan Standard Time)', 18);

DROP TABLE IF EXISTS `fee_structures`;
CREATE TABLE `fee_structures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monthly_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `admission_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `exam_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `other_charges` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `class_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fee_structures_class_id_academic_year_id` (`class_id`,`academic_year_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `fee_structures_ibfk_61` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fee_structures_ibfk_62` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `fee_structures` VALUES 
(1, '1500.00', '0.00', '500.00', '0.00', 'Wed Jun 24 2026 03:51:58 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:40:11 GMT+0500 (Pakistan Standard Time)', 4, 1),
(2, '3000.00', '0.00', '0.00', '0.00', 'Wed Jun 24 2026 23:45:29 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:20:03 GMT+0500 (Pakistan Standard Time)', 13, 1);

DROP TABLE IF EXISTS `fees`;
CREATE TABLE `fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `remaining_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('Paid','Pending','Partial') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `student_id` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `fees_student_id_month_academic_year_id` (`student_id`,`month`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `fees_ibfk_91` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fees_ibfk_92` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fees_ibfk_93` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `fees` VALUES 
(1, 'January', '1500.00', '1500.00', '0.00', 'Paid', 'Wed Jun 24 2026 03:52:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:52:59 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(2, 'January', '1500.00', '1500.00', '0.00', 'Paid', 'Wed Jun 24 2026 03:52:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:52:55 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(3, 'January', '1500.00', '1500.00', '0.00', 'Paid', 'Wed Jun 24 2026 03:52:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:52:40 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(4, 'January', '1500.00', '1500.00', '0.00', 'Paid', 'Wed Jun 24 2026 03:52:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:53:02 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(5, 'January', '1500.00', '1500.00', '0.00', 'Paid', 'Wed Jun 24 2026 03:52:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:53:05 GMT+0500 (Pakistan Standard Time)', 6, 4, 1),
(6, 'February', '1700.00', '1700.00', '0.00', 'Paid', 'Wed Jun 24 2026 23:39:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:41:25 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(7, 'February', '1700.00', '1700.00', '0.00', 'Paid', 'Wed Jun 24 2026 23:39:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:41:21 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(8, 'February', '1700.00', '1700.00', '0.00', 'Paid', 'Wed Jun 24 2026 23:39:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:40:55 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(9, 'February', '1700.00', '1700.00', '0.00', 'Paid', 'Wed Jun 24 2026 23:39:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:41:28 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(10, 'February', '1700.00', '1700.00', '0.00', 'Paid', 'Wed Jun 24 2026 23:39:25 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:41:34 GMT+0500 (Pakistan Standard Time)', 6, 4, 1),
(11, 'August', '1200.00', '1200.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:09 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:28:02 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(12, 'August', '1500.00', '1500.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:09 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:29:02 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(13, 'August', '1500.00', '1500.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:10 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:27:46 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(14, 'August', '1500.00', '1500.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:10 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:39:39 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(15, 'August', '1500.00', '1500.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:10 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 17:28:20 GMT+0500 (Pakistan Standard Time)', 6, 4, 1),
(16, 'August', '1500.00', '1500.00', '0.00', 'Paid', 'Sun Aug 23 2026 17:27:10 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:39:49 GMT+0500 (Pakistan Standard Time)', 8, 4, 1),
(17, 'August', '3000.00', '3000.00', '0.00', 'Paid', 'Sun Aug 23 2026 21:30:09 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:33:02 GMT+0500 (Pakistan Standard Time)', 9, 13, 1),
(18, 'August', '3000.00', '3000.00', '0.00', 'Paid', 'Sun Aug 23 2026 21:30:09 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:33:13 GMT+0500 (Pakistan Standard Time)', 10, 13, 1),
(19, 'August', '0.00', '0.00', '0.00', 'Pending', 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', 11, 5, 1),
(20, 'August', '0.00', '0.00', '0.00', 'Pending', 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', 12, 5, 1);

DROP TABLE IF EXISTS `notices`;
CREATE TABLE `notices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `password_resets`;
CREATE TABLE `password_resets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `otp_hash` varchar(255) NOT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `attempts` int DEFAULT '0',
  `resend_count` int DEFAULT '0',
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `target_email` varchar(255) DEFAULT NULL,
  `purpose` enum('password_reset','recovery_verification') DEFAULT 'password_reset',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `password_resets` VALUES 
(1, 'admin@waseem.edu.pk', '$2b$10$8KtPHIwSZm2jQzEewdNjuOOq6dmwfvkmTGjwNHHghUDpplPX1KNfu', NULL, 1, 0, 'Sun Aug 23 2026 22:23:30 GMT+0500 (Pakistan Standard Time)', 1, 'Sun Aug 23 2026 22:13:30 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 22:15:04 GMT+0500 (Pakistan Standard Time)', NULL, 'password_reset'),
(2, 'admin@waseem.edu.pk', '$2b$10$fjp5XOXf.ks5KDu.Bz7XZOb2vMQ1XMxQiYdp8fuxGjBX9tHrGijGq', NULL, 1, 0, 'Sun Aug 23 2026 22:25:04 GMT+0500 (Pakistan Standard Time)', 1, 'Sun Aug 23 2026 22:15:04 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 22:15:05 GMT+0500 (Pakistan Standard Time)', NULL, 'password_reset'),
(3, 'admin@waseem.edu.pk', '$2b$10$4V4KWOWQGN6JUM58nYNB7eUnIktm50tkcg9wx4KODbrcSKJ1KWphy', NULL, 0, 0, 'Mon Aug 24 2026 00:00:11 GMT+0500 (Pakistan Standard Time)', 1, 'Sun Aug 23 2026 23:50:11 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:04:12 GMT+0500 (Pakistan Standard Time)', 'testadmin@gmail.com', 'recovery_verification'),
(4, 'admin@waseem.edu.pk', '$2b$10$mOjZDYPUAltRI2Z8b9WoDuu8hz1BEu7nBES.QdpOFqjZeDRGDBIUy', NULL, 1, 0, 'Mon Aug 24 2026 00:14:12 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 00:04:12 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:05:18 GMT+0500 (Pakistan Standard Time)', 'testadmin@gmail.com', 'recovery_verification'),
(5, 'admin@waseem.edu.pk', '$2b$10$xByE0uO8Ih5Rkn9H15mdM.MEi3U4TUpPEhDyAM.3kmlTQthdD1Oqu', NULL, 1, 0, 'Mon Aug 24 2026 00:18:54 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 00:08:54 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:13:02 GMT+0500 (Pakistan Standard Time)', 'testadmin@gmail.com', 'password_reset'),
(6, 'usman@waseem.edu.pk', '$2b$10$ZUGNewJE1RgGmefmHfhhkOI9mOKOfV/Az0JE6XvQyVw7LD60Yxwia', NULL, 0, 0, 'Mon Aug 24 2026 00:28:56 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 00:18:56 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:21:00 GMT+0500 (Pakistan Standard Time)', 'jmusman723@gmail.com', 'recovery_verification'),
(7, 'usman@waseem.edu.pk', '$2b$10$vQurtUGCaFs52kvT4sOfJe4qmoPctmBS4QOxu5xi3QYhJ5Ga.tALm', NULL, 1, 0, 'Mon Aug 24 2026 00:31:00 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 00:21:00 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:31:54 GMT+0500 (Pakistan Standard Time)', 'jmusman723@gmail.com', 'recovery_verification'),
(8, 'usman@waseem.edu.pk', '$2b$10$jtxGk4UNOjAajXgcis3AlOrb3aK6id941q181FtotBVDfqwuy7a4K', NULL, 1, 0, 'Mon Aug 24 2026 00:41:54 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 00:31:54 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:29:07 GMT+0500 (Pakistan Standard Time)', 'jmusman723@gmail.com', 'recovery_verification'),
(9, 'usman@waseem.edu.pk', '$2b$10$FQbrfKO9gn/8UsMR0khlHehhkTuBNPJk9gT6dWIlF2uEkeSVCJ5IO', NULL, 0, 0, 'Mon Aug 24 2026 02:39:07 GMT+0500 (Pakistan Standard Time)', 0, 'Mon Aug 24 2026 02:29:07 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:29:07 GMT+0500 (Pakistan Standard Time)', 'jmusman723@gmail.com', 'recovery_verification'),
(10, 'imran@waseem.edu.pk', '$2b$10$BzeKVZJZWjFSf8qzUqODpOhkGdeiKi1h.8hwF3I08nCwRU4OwZb5e', NULL, 1, 0, 'Mon Aug 24 2026 02:40:19 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 02:30:19 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:31:27 GMT+0500 (Pakistan Standard Time)', 'usman29312@gmail.com', 'recovery_verification'),
(11, 'imran@waseem.edu.pk', '$2b$10$YuCdR5f.kXepUB22vfBh3uFcNSLTvE7eWDyDiXqMrysrSOfiR/pOa', NULL, 0, 0, 'Mon Aug 24 2026 02:41:27 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 02:31:27 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:32:50 GMT+0500 (Pakistan Standard Time)', 'usman29312@gmail.com', 'recovery_verification'),
(12, 'imran@waseem.edu.pk', '$2b$10$9xkUiTwt5HMVwWynGlcyu.OqUOVQuTEp08RjR5/79gESJtKR3Vsn6', NULL, 1, 0, 'Mon Aug 24 2026 02:42:50 GMT+0500 (Pakistan Standard Time)', 1, 'Mon Aug 24 2026 02:32:50 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:33:13 GMT+0500 (Pakistan Standard Time)', 'usman70128132uol@gmail.com', 'recovery_verification');

DROP TABLE IF EXISTS `result_subjects`;
CREATE TABLE `result_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marks` int NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `result_id` int DEFAULT NULL,
  `subject_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `result_subjects_result_id_subject_id` (`result_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `result_subjects_ibfk_61` FOREIGN KEY (`result_id`) REFERENCES `results` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `result_subjects_ibfk_62` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `result_subjects` VALUES 
(1, 34, 'Wed Jun 24 2026 02:59:28 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:59:28 GMT+0500 (Pakistan Standard Time)', 1, 7),
(2, 23, 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 2, 7),
(3, 56, 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 3, 7),
(4, 90, 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 4, 7),
(5, 56, 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 5, 7),
(6, 23, 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 1, 1),
(7, 54, 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 4, 1),
(8, 34, 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 2, 1),
(9, 45, 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 3, 1),
(10, 54, 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:16 GMT+0500 (Pakistan Standard Time)', 5, 1),
(11, 67, 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 5, 3),
(12, 45, 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 1, 3),
(13, 65, 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 2, 3),
(14, 56, 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 3, 3),
(15, 34, 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:01:55 GMT+0500 (Pakistan Standard Time)', 4, 3),
(16, 45, 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 1, 4),
(17, 67, 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 2, 4),
(18, 54, 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 4, 4),
(19, 23, 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 5, 4),
(20, 56, 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 3, 4),
(21, 67, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 6, 7),
(22, 45, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 8, 7),
(23, 76, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 7, 7),
(24, 34, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 9, 7),
(25, 56, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 10, 7),
(26, 56, 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 11, 7),
(27, 56, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 8, 1),
(28, 78, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 9, 1),
(29, 78, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 6, 1),
(30, 68, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 10, 1),
(31, 89, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 7, 1),
(32, 89, 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:10:49 GMT+0500 (Pakistan Standard Time)', 11, 1),
(33, 78, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 9, 3),
(34, 78, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 8, 3),
(35, 67, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 10, 3),
(36, 67, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 6, 3),
(37, 86, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 7, 3),
(38, 78, 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:16 GMT+0500 (Pakistan Standard Time)', 11, 3),
(39, 67, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 9, 4),
(40, 56, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 8, 4),
(41, 97, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 10, 4),
(42, 78, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 6, 4),
(43, 89, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 11, 4),
(44, 78, 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:11:43 GMT+0500 (Pakistan Standard Time)', 7, 4),
(45, 67, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 9, 5),
(46, 89, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 10, 5),
(47, 56, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 8, 5),
(48, 87, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 6, 5),
(49, 56, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 7, 5),
(50, 45, 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:11 GMT+0500 (Pakistan Standard Time)', 11, 5),
(51, 67, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 8, 2),
(52, 78, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 9, 2),
(53, 86, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 10, 2),
(54, 89, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 7, 2),
(55, 89, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 6, 2),
(56, 78, 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 11, 2);

DROP TABLE IF EXISTS `results`;
CREATE TABLE `results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_type` varchar(255) NOT NULL,
  `percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `grade` varchar(5) NOT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `student_id` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `results_student_id_exam_type_academic_year_id` (`student_id`,`exam_type`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `results_ibfk_91` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `results_ibfk_92` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `results_ibfk_93` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `results` VALUES 
(1, 'Mid Term', '45.00', 'D', '', 'Wed Jun 24 2026 02:59:27 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(2, 'Mid Term', '67.00', 'B', '', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(3, 'Mid Term', '56.00', 'C', '', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(4, 'Mid Term', '54.00', 'C', '', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(5, 'Mid Term', '23.00', 'F', '', 'Wed Jun 24 2026 03:00:16 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 03:02:21 GMT+0500 (Pakistan Standard Time)', 6, 4, 1),
(6, 'First Term', '89.00', 'A+', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 8, 4, 1),
(7, 'First Term', '89.00', 'A+', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(8, 'First Term', '67.00', 'B', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(9, 'First Term', '78.00', 'A', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(10, 'First Term', '86.00', 'A+', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(11, 'First Term', '78.00', 'A', '', 'Thu Jun 25 2026 00:10:09 GMT+0500 (Pakistan Standard Time)', 'Thu Jun 25 2026 00:12:44 GMT+0500 (Pakistan Standard Time)', 6, 4, 1);

DROP TABLE IF EXISTS `student_enrollments`;
CREATE TABLE `student_enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `student_id` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_enrollments_student_id_academic_year_id` (`student_id`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `student_enrollments_ibfk_91` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_enrollments_ibfk_92` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `student_enrollments_ibfk_93` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `student_enrollments` VALUES 
(1, 'Wed Jun 24 2026 02:09:49 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:10:10 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(2, 'Wed Jun 24 2026 02:19:56 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:19:56 GMT+0500 (Pakistan Standard Time)', 2, 4, 1),
(3, 'Wed Jun 24 2026 02:20:32 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:20:32 GMT+0500 (Pakistan Standard Time)', 3, 4, 1),
(4, 'Wed Jun 24 2026 02:21:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:21:26 GMT+0500 (Pakistan Standard Time)', 4, 4, 1),
(5, 'Wed Jun 24 2026 02:22:06 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:22:06 GMT+0500 (Pakistan Standard Time)', 6, 4, 1),
(6, 'Wed Jun 24 2026 23:55:49 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:55:49 GMT+0500 (Pakistan Standard Time)', 8, 4, 1),
(7, 'Sun Aug 23 2026 20:44:14 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:44:14 GMT+0500 (Pakistan Standard Time)', 9, 13, 1),
(8, 'Sun Aug 23 2026 20:45:07 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:45:07 GMT+0500 (Pakistan Standard Time)', 10, 13, 1),
(9, 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', 11, 5, 1),
(10, 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', 12, 5, 1);

DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `roll_number` varchar(255) NOT NULL,
  `registration_number` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `father_name` varchar(255) NOT NULL,
  `dob` date NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `address` text,
  `photo` varchar(255) DEFAULT NULL,
  `admission_date` date NOT NULL,
  `guardian_name` varchar(255) NOT NULL,
  `guardian_phone` varchar(255) NOT NULL,
  `emergency_contact` varchar(255) NOT NULL,
  `blood_group` varchar(255) DEFAULT NULL,
  `previous_school` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `custom_fee` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roll_number` (`roll_number`),
  UNIQUE KEY `registration_number` (`registration_number`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `students` VALUES 
(1, '12', '2002312', 'Muhammad Asad', 'akram', '2000-01-01', 'Other', '03223121113', 'N/A', NULL, '2026-06-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 02:09:49 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:40:49 GMT+0500 (Pakistan Standard Time)', '1200.00'),
(2, '1', '2002313', 'Ali', 'Ahmad', '2000-01-01', 'Other', '03321212211', 'N/A', NULL, '2026-06-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 02:19:56 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:31:32 GMT+0500 (Pakistan Standard Time)', NULL),
(3, '2', '2002314', 'Ahmad', 'salman', '2000-01-01', 'Other', '023322121221', 'N/A', NULL, '2026-06-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 02:20:32 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:31:32 GMT+0500 (Pakistan Standard Time)', NULL),
(4, '5', '2002315', 'Salman', 'hussain', '2000-01-01', 'Other', '3049203232', 'N/A', NULL, '2026-06-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 02:21:26 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:31:32 GMT+0500 (Pakistan Standard Time)', NULL),
(6, '13', '2002316', 'Tasaduq', 'Ali', '2000-01-01', 'Other', '03231212212', 'N/A', NULL, '2026-06-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 02:22:06 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:31:32 GMT+0500 (Pakistan Standard Time)', NULL),
(8, '10', '2002317', 'umar', 'nadeem', '2000-01-01', 'Other', '0334435545', 'N/A', NULL, '2026-06-24', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Wed Jun 24 2026 23:55:49 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:55:49 GMT+0500 (Pakistan Standard Time)', NULL),
(9, '239291', '2002318', 'Usama', 'Tariq', '2000-01-01', 'Other', '03333434532', 'N/A', NULL, '2026-08-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Sun Aug 23 2026 20:44:14 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:44:14 GMT+0500 (Pakistan Standard Time)', NULL),
(10, '12321', '2002319', 'Usman', 'Sameer', '2000-01-01', 'Other', '03329889645', 'N/A', NULL, '2026-08-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Sun Aug 23 2026 20:45:07 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 20:45:07 GMT+0500 (Pakistan Standard Time)', NULL),
(11, '1232', '2002320', 'Yaseen', 'Ali', '2000-01-01', 'Other', '0343472222', 'N/A', NULL, '2026-08-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:49:32 GMT+0500 (Pakistan Standard Time)', NULL),
(12, '12231', '2002321', 'husnain', 'basharat', '2000-01-01', 'Other', '03231212121', 'N/A', NULL, '2026-08-23', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:50:14 GMT+0500 (Pakistan Standard Time)', NULL);

DROP TABLE IF EXISTS `subjects`;
CREATE TABLE `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(255) NOT NULL,
  `total_marks` int NOT NULL DEFAULT '100',
  `passing_marks` int NOT NULL DEFAULT '33',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `class_id` int DEFAULT NULL,
  `teacher_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subjects_class_id_subject_name` (`class_id`,`subject_name`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `subjects_ibfk_61` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `subjects_ibfk_62` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `subjects` VALUES 
(1, 'english', 100, 33, 'Wed Jun 24 2026 02:57:50 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:57:50 GMT+0500 (Pakistan Standard Time)', 4, 1),
(2, 'urdu', 100, 33, 'Wed Jun 24 2026 02:57:57 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:57:57 GMT+0500 (Pakistan Standard Time)', 4, 1),
(3, 'islamiyat', 100, 33, 'Wed Jun 24 2026 02:58:06 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:58:06 GMT+0500 (Pakistan Standard Time)', 4, 1),
(4, 'math', 100, 33, 'Wed Jun 24 2026 02:58:12 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:58:12 GMT+0500 (Pakistan Standard Time)', 4, 1),
(5, 'pak studies', 100, 33, 'Wed Jun 24 2026 02:58:20 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:58:20 GMT+0500 (Pakistan Standard Time)', 4, 1),
(6, 'physics', 100, 33, 'Wed Jun 24 2026 02:58:28 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:58:28 GMT+0500 (Pakistan Standard Time)', 4, 1),
(7, 'Biology', 100, 33, 'Wed Jun 24 2026 02:58:43 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 02:58:43 GMT+0500 (Pakistan Standard Time)', 4, 1);

DROP TABLE IF EXISTS `teacher_assignments`;
CREATE TABLE `teacher_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `class_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_class_year_uniq` (`teacher_id`,`class_id`,`academic_year_id`),
  KEY `class_id` (`class_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `teacher_assignments_ibfk_91` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_assignments_ibfk_92` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_assignments_ibfk_93` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `teacher_assignments` VALUES 
(1, 'Wed Jun 24 2026 00:25:54 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:25:54 GMT+0500 (Pakistan Standard Time)', 1, 4, 1),
(2, 'Wed Jun 24 2026 23:50:18 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:50:18 GMT+0500 (Pakistan Standard Time)', 1, 13, 1),
(3, 'Sun Aug 23 2026 21:43:19 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:43:19 GMT+0500 (Pakistan Standard Time)', 2, 8, 1),
(4, 'Sun Aug 23 2026 21:48:11 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 21:48:11 GMT+0500 (Pakistan Standard Time)', 3, 5, 1);

DROP TABLE IF EXISTS `teacher_attendance`;
CREATE TABLE `teacher_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `status` enum('Present','Absent','Leave') NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_attendance_teacher_id_date` (`teacher_id`,`date`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `teacher_attendance_ibfk_61` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_attendance_ibfk_62` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `teacher_attendance` VALUES 
(1, '2026-06-24', 'Absent', 'Wed Jun 24 2026 04:00:47 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 04:00:47 GMT+0500 (Pakistan Standard Time)', 1, 1),
(2, '2026-02-12', 'Present', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 1, 1),
(3, '2026-02-12', 'Present', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 3, 1),
(4, '2026-02-12', 'Absent', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:51:36 GMT+0500 (Pakistan Standard Time)', 2, 1);

DROP TABLE IF EXISTS `teacher_salary_payments`;
CREATE TABLE `teacher_salary_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL,
  `payment_date` date NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `salary_record_id` int DEFAULT NULL,
  `payment_method` enum('Cash','Bank Transfer','Check','Card') NOT NULL DEFAULT 'Cash',
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `salary_record_id` (`salary_record_id`),
  CONSTRAINT `teacher_salary_payments_ibfk_29` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_salary_payments_ibfk_30` FOREIGN KEY (`salary_record_id`) REFERENCES `teacher_salary_records` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `teacher_salary_payments` VALUES 
(12, '5000.00', '2026-08-23', '', 'Sun Aug 23 2026 19:20:13 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 19:20:13 GMT+0500 (Pakistan Standard Time)', 3, 11, 'Cash');

DROP TABLE IF EXISTS `teacher_salary_records`;
CREATE TABLE `teacher_salary_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month` varchar(255) NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `remaining_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('Pending','Partial','Paid') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `academic_year_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `academic_year_id` (`academic_year_id`),
  CONSTRAINT `teacher_salary_records_ibfk_31` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `teacher_salary_records_ibfk_32` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `teacher_salary_records` VALUES 
(10, 'August', '12222.00', '0.00', '12222.00', 'Pending', 'Sun Aug 23 2026 19:19:48 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 19:19:48 GMT+0500 (Pakistan Standard Time)', 1, 1),
(11, 'August', '5000.00', '5000.00', '0.00', 'Paid', 'Sun Aug 23 2026 19:19:48 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 19:20:13 GMT+0500 (Pakistan Standard Time)', 3, 1),
(12, 'August', '12223.00', '0.00', '12223.00', 'Pending', 'Sun Aug 23 2026 19:19:48 GMT+0500 (Pakistan Standard Time)', 'Sun Aug 23 2026 19:19:48 GMT+0500 (Pakistan Standard Time)', 2, 1);

DROP TABLE IF EXISTS `teachers`;
CREATE TABLE `teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `qualification` varchar(255) DEFAULT NULL,
  `salary` decimal(10,2) NOT NULL DEFAULT '0.00',
  `joining_date` date NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `user_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `teachers` VALUES 
(1, 'ms', '12222.00', '2012-12-12', 'Wed Jun 24 2026 00:25:23 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 00:25:23 GMT+0500 (Pakistan Standard Time)', 2),
(2, 'bsse', '12223.00', '2003-02-23', 'Wed Jun 24 2026 23:38:20 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:38:20 GMT+0500 (Pakistan Standard Time)', 3),
(3, 'ms', '5000.00', '2003-03-12', 'Wed Jun 24 2026 23:49:43 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:49:43 GMT+0500 (Pakistan Standard Time)', 4);

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','teacher') NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `recovery_email` varchar(255) DEFAULT NULL,
  `recovery_email_verified` tinyint(1) DEFAULT '0',
  `recovery_email_verified_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `email_32` (`email`),
  UNIQUE KEY `email_33` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `users` VALUES 
(1, 'Principal Admin', 'admin@waseem.edu.pk', '$2b$10$.MijTzGZNPh6Fzbxmba5ueJKjWUfdEa2pKxNjFRn5wtz8HMmsEhzW', 'admin', 'Wed Jun 24 2026 00:02:45 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 00:14:52 GMT+0500 (Pakistan Standard Time)', NULL, 0, NULL),
(2, 'imran', 'imran@waseem.edu.pk', '$2b$10$7e7F9eR0/JYrGXXzNwIar.NLMqDprSeIKR0mf7azmEG6VO0URTpgq', 'teacher', 'Wed Jun 24 2026 00:25:23 GMT+0500 (Pakistan Standard Time)', 'Mon Aug 24 2026 02:36:55 GMT+0500 (Pakistan Standard Time)', 'usman70128132uol@gmail.com', 1, 'Mon Aug 24 2026 02:33:13 GMT+0500 (Pakistan Standard Time)'),
(3, 'usman', 'usman@waseem.edu.pk', '$2b$10$.SDsIBSviKW4NMYqJGGmQuZflG.lHlzgHdDjldxk6lQaRtvl4GC9K', 'teacher', 'Wed Jun 24 2026 23:38:20 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:38:20 GMT+0500 (Pakistan Standard Time)', NULL, 0, NULL),
(4, 'umar', 'umar@waseem.edu.pk', '$2b$10$QJ3ZiwULnyig0Zh0IseCCOmxk1D1ncpMcncO8uhXoopjY4SRxz8Gq', 'teacher', 'Wed Jun 24 2026 23:49:43 GMT+0500 (Pakistan Standard Time)', 'Wed Jun 24 2026 23:49:43 GMT+0500 (Pakistan Standard Time)', NULL, 0, NULL);

SET FOREIGN_KEY_CHECKS = 1;
