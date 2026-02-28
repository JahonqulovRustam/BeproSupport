
import { SystemModule, Question, User } from './types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Super Admin',
    login: 'superadmin',
    password: '123',
    role: 'ADMIN',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=default'
  }
];

export const BEPRO_MODULES: SystemModule[] = [
  {
    id: 's101',
    name: 'Sistema-101',
    icon: 'fa-server',
    description: 'Asosiy infratuzilma va chiptalar (ticketing) tizimi arxitekturasi.',
    lessons: []
  },
  {
    id: 's102',
    name: 'Sistema-102',
    icon: 'fa-database',
    description: "Ma'lumotlar bazasi so'rovlarini optimallashtirish va hisobot vositalari.",
    lessons: []
  },
  {
    id: 's103',
    name: 'Sistema-103',
    icon: 'fa-network-wired',
    description: 'Tashqi API integratsiyalari va uchinchi tomon webhooklari.',
    lessons: []
  },
  {
    id: 's104',
    name: 'Sistema-104',
    icon: 'fa-shield-halved',
    description: 'Xavfsizlik protokollari, loglar va audit jurnallari.',
    lessons: []
  },
  {
    id: 'uzgps',
    name: 'UZGPS',
    icon: 'fa-location-dot',
    description: 'Geolokatsiya kuzatuv xizmatlari va uskunalar sinxronizatsiyasi.',
    lessons: []
  },
  {
    id: 'pacs',
    name: 'Pacs',
    icon: 'fa-x-ray',
    description: 'Tibbiy tasvirlarni arxivlash va DICOM uzatish tizimi.',
    lessons: []
  },
  {
    id: 'lis',
    name: 'LIS',
    icon: 'fa-flask-vial',
    description: 'Laboratoriya axborot tizimini boshqarish.',
    lessons: []
  }
];
