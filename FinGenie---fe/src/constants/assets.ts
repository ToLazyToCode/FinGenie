/**
 * Central asset registry - use Image source from these require() calls.
 * Add new icons here and reference by key in components.
 */

export const images = {
  geniePet: require('../../assets/image/genie-pet.png'),
};

const notificationBell = require('../../assets/icons/notification.png');
const incomePlus = require('../../assets/icons/income.png');
const expenseMinus = require('../../assets/icons/expense.png');
const fireStreak = require('../../assets/icons/streak.png');
const salaryIncome = require('../../assets/icons/salary.png');
const foodCategory = require('../../assets/icons/food.png');
const transportCategory = require('../../assets/icons/transport.png');
const entertainmentCategory = require('../../assets/icons/entertainment.png');

export const icons = {
  notificationBell,
  incomePlus,
  expenseMinus,
  fireStreak,
  salaryIncome,
  foodCategory,
  transportCategory,
  entertainmentCategory,
  spark: require('../../assets/icons/spark.png'),
  walletMono: require('../../assets/icons/e-wallet.png'),
  petBuddy: require('../../assets/icons/premium.png'),
  // Backward compatibility keys (legacy components)
  notification: notificationBell,
  income: incomePlus,
  expense: expenseMinus,
  streak: fireStreak,
  salary: salaryIncome,
  food: foodCategory,
  transport: transportCategory,
  entertainment: entertainmentCategory,
};

/** Map category keys to icon source for transaction list */
export const categoryIcons: Record<string, ReturnType<typeof require>> = {
  Income: icons.salaryIncome,
  Salary: icons.salaryIncome,
  Food: icons.foodCategory,
  Transport: icons.transportCategory,
  Entertainment: icons.entertainmentCategory,
};

/** Tab navigation icons - `-active` postfix for selected tab */
export const tabIcons = {
  home: {
    default: require('../../assets/icons/tab-navigation/home.png'),
    active: require('../../assets/icons/tab-navigation/home-chosen.png'),
  },
  wallet: {
    default: require('../../assets/icons/tab-navigation/wallet.png'),
    active: require('../../assets/icons/tab-navigation/wallet-chosen.png'),
  },
  pet: {
    default: require('../../assets/icons/tab-navigation/pet.png'),
    active: require('../../assets/icons/tab-navigation/pet-chosen.png'),
  },
  analysis: {
    default: require('../../assets/icons/tab-navigation/analysis.png'),
    active: require('../../assets/icons/tab-navigation/analysis-chosen.png'),
  },
  social: {
    default: require('../../assets/icons/tab-navigation/social.png'),
    active: require('../../assets/icons/tab-navigation/social-chosen.png'),
  },
  profile: {
    default: require('../../assets/icons/tab-navigation/profile.png'),
    active: require('../../assets/icons/tab-navigation/profile-chosen.png'),
  },
};
