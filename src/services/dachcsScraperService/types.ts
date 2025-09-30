export type DachcsMatch = {
  id: number;
  faceitId: string;
  status: "NOT_READY" | "CLAIMED" | "CLAIMABLE";

  teamLeftName: string;
  teamRightName: string;
  twitchChannelName: string | undefined;
  date: string;
};
