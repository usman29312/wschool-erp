const { User, Class, AcademicYear } = require('../models');

async function seedDatabase() {
  try {
    // 1. Seed default Admin if none exists
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount === 0) {
      await User.create({
        name: 'Principal Admin',
        email: 'admin@waseem.edu.pk',
        password: 'admin123',
        role: 'admin'
      });
      console.log('Seeded default admin account: admin@waseem.edu.pk / admin123');
    }

    // 2. Seed default Academic Year if none exist
    const sessionCount = await AcademicYear.count();
    if (sessionCount === 0) {
      await AcademicYear.create({
        year_name: '2026-2027',
        status: 'active'
      });
      console.log('Seeded initial active session: 2026-2027');
    }

    // 3. Seed default classes
    const classCount = await Class.count();
    if (classCount === 0) {
      const classNames = [
        'Playgroup', 'Nursery', 'Prep',
        'Class 1', 'Class 2', 'Class 3', 'Class 4',
        'Class 5', 'Class 6', 'Class 7', 'Class 8',
        'Class 9', 'Class 10', 'Class 11', 'Class 12'
      ];
      for (const name of classNames) {
        await Class.create({
          class_name: name,
          section: 'A'
        });
      }
      console.log('Seeded standard school classes (Playgroup to Class 12).');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = seedDatabase;
