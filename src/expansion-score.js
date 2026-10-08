// Distinct melodies, drum rhythms and sound envelopes for the expanded chapters.
export const EXPANSION_SCORES={
  glimmer:{roots:[36,31,33,29],chords:[[60,64,67,71],[55,59,62,67],[57,60,64,69],[53,57,60,64]],melody:[[84,79,76,79,83,79,76,72],[79,74,71,74,78,74,71,67],[81,76,72,76,79,76,72,69],[77,72,69,72,76,72,69,65]],kind:'liquid',kicks:[0,2,3.5],bassSteps:[.5,1.75,2.5,3.75],tone:{mod:.7,decay:.24,ratio:3,pan:.65}},
  daybreak:{roots:[34,30,37,32],chords:[[58,61,65,68],[54,58,61,65],[61,65,68,72],[56,60,63,68]],melody:[[82,77,79,84,82,79,77,73],[78,73,77,82,78,77,73,70],[85,80,82,87,85,82,80,77],[80,75,79,84,80,79,75,72]],kind:'garage',kicks:[0,1.75,2.75,3.5],bassSteps:[.5,1.25,2.5,3.25],swing:.035,tone:{mod:1.4,decay:.13,ratio:2.5,pan:.45}},
  arc:{roots:[27,34,30,32],chords:[[51,54,58,63],[58,61,65,70],[54,58,61,66],[56,60,63,68]],melody:[[75,82,78,75,73,78,82,85],[82,89,85,82,80,85,89,92],[78,85,82,78,77,82,85,89],[80,87,84,80,79,84,87,91]],kind:'electro',kicks:[0,.75,2,2.75],bassSteps:[.25,1.5,2.25,3.5],tone:{mod:4.2,decay:.12,ratio:1.5,pan:.3}},
  zero:{roots:[26,29,33,24],chords:[[50,53,57,62],[53,57,60,65],[57,60,64,69],[48,52,55,60]],melody:[[74,77,81,86,84,81,77,72],[77,81,84,89,88,84,81,76],[81,84,88,93,91,88,84,79],[72,76,79,84,83,79,76,71]],kind:'breaks',kicks:[0,1.5,2.75,3.75],bassSteps:[0,.75,2.5,3.25],tone:{mod:2.8,decay:.20,ratio:2.01,pan:.5},growls:[1.25,3.25]},
  overclock:{roots:[28,24,31,26],chords:[[52,55,59,64],[48,52,55,60],[55,59,62,67],[50,54,57,62]],melody:[[76,83,79,76,74,79,83,86],[72,79,76,72,71,76,79,83],[79,86,83,79,78,83,86,90],[74,81,78,74,73,78,81,85]],kind:'hard',kicks:[0,1,2,3],bassSteps:[.5,1.5,2.5,3.5],tone:{mod:5,decay:.095,ratio:2.7,pan:.18},growls:[.75,2.75]},
  collapse:{roots:[25,32,28,30],chords:[[49,52,56,61],[56,59,63,68],[52,56,59,64],[54,58,61,66]],melody:[[73,80,76,85,80,76,72,80],[80,87,83,92,87,83,79,87],[76,83,80,89,83,80,75,83],[78,85,82,91,85,82,77,85]],kind:'fracture',kicks:[0,.75,2,2.75,3.5],bassSteps:[.25,1.5,2.25,3.75],tone:{mod:6.2,decay:.11,ratio:3.01,pan:.4},growls:[1.25,3.25]},
};
export const EXPANSION_ARRANGEMENTS={
  glimmer:[[0,'intro'],[2,'verse'],[8,'bridge'],[10,'build'],[12,'drop'],[18,'bridge'],[20,'build'],[24,'drop'],[32,'outro']],
  daybreak:[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[14,'drop'],[22,'bridge'],[24,'build'],[28,'drop'],[36,'outro']],
  arc:[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[14,'drop'],[24,'bridge'],[26,'build'],[30,'drop'],[40,'outro']],
  zero:[[0,'intro'],[2,'verse'],[10,'bridge'],[12,'build'],[16,'drop'],[26,'bridge'],[28,'build'],[32,'drop'],[44,'outro']],
  overclock:[[0,'intro'],[2,'verse'],[12,'bridge'],[14,'build'],[18,'drop'],[28,'bridge'],[30,'build'],[34,'drop'],[48,'outro']],
  collapse:[[0,'intro'],[2,'verse'],[12,'bridge'],[14,'build'],[18,'drop'],[30,'bridge'],[32,'build'],[34,'drop'],[52,'outro']],
};
