export const simulateHumanDelay = () => {
  const min = 1000;
  const max = 2500;

  const duration = Math.floor(Math.random() * (max - min) + min);

  console.log(`[Wait] ${duration}ms`);
  return new Promise((resolve) => setTimeout(resolve, duration));
};
