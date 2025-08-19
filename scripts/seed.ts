import mongoose from 'mongoose';
import connectDB from '../lib/database';
import User from '../lib/models/User';
import { hashPassword } from '../lib/auth';

async function seedDatabase() {
  try {
    await connectDB();

    console.log('Clearing existing users...');
    await User.deleteMany({});

    console.log('Creating admin user...');
    const adminPassword = await hashPassword('admin123');
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      position: 'Manager',
      phone: '123-456-7890',
      role: 'admin',
      priceLevel: 'ราคาพนักงาน',
      isActive: true,
    });

    console.log('Creating employee user...');
    const employeePassword = await hashPassword('emp123');
    await User.create({
      username: 'employee1',
      email: 'employee1@example.com',
      password: employeePassword,
      name: 'Employee One',
      position: 'Sales',
      phone: '098-765-4321',
      role: 'employee',
      priceLevel: 'ราคาปกติ',
      isActive: true,
    });

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
