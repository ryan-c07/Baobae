export type FormAnswers = {
  displayName: string;
  vibeWord: string;
  creativeAct: string;
  mood: number;
  colorPick: string;
  wantsNewsletter: boolean;
  freeform: string;
  creativeDoodle: string | null;
};

export const defaultAnswers = (): FormAnswers => ({
  displayName: "",
  vibeWord: "",
  creativeAct: "",
  mood: 50,
  colorPick: "#c084fc",
  wantsNewsletter: false,
  freeform: "",
  creativeDoodle: null,
});
