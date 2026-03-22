import brain from "./kograph-brain.json";

type Intent = {
  tag: string;
  patterns: string[];
  responses: string[];
};

type BrainShape = {
  identity: {
    name: string;
    version: string;
    role: string;
    developer: string;
    persona: string;
    fallbackResponses: string[];
  };
  intents: Intent[];
};

const typedBrain = brain as BrainShape;

export type KographReply = {
  tag: string;
  response: string;
  suspicious: boolean;
};

function normalize(input: string) {
  return input.toLowerCase().trim().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ");
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function getKographIdentity() {
  return typedBrain.identity;
}

export function createKographReply(message: string): KographReply {
  const normalized = normalize(message);

  if (/(siapa developer|siapa dev|developer kamu siapa|who made you|who is your developer)/.test(normalized)) {
    return { tag: "developer", response: "Fizzxdev", suspicious: false };
  }

  for (const intent of typedBrain.intents) {
    for (const pattern of intent.patterns) {
      if (normalized.includes(normalize(pattern))) {
        return {
          tag: intent.tag,
          response: pickRandom(intent.responses),
          suspicious: intent.tag === "warning"
        };
      }
    }
  }

  return {
    tag: "fallback",
    response: pickRandom(typedBrain.identity.fallbackResponses),
    suspicious: false
  };
}
