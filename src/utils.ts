const randIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min) + min);
};

export const sleepFor = (min: number, max: number) => {
  let duration = randIntFromInterval(min, max);
  console.log("waiting for ", duration / 1000, "seconds");
  return duration;
};
