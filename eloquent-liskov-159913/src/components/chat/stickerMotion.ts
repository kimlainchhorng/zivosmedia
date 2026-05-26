type StickerTone = "angry" | "sad" | "sleepy" | "love" | "happy" | "shy" | "float";

type MotionKeyframes = {
  x?: number[];
  y?: number[];
  rotate?: number[];
  scale?: number[];
  scaleX?: number[];
  scaleY?: number[];
  opacity?: number[];
};

type MotionTransition = {
  duration: number;
  repeat: number;
  ease: "easeInOut";
  delay?: number;
  repeatDelay?: number;
};

export interface StickerMotionSpec {
  wrapper: {
    animate: MotionKeyframes;
    transition: MotionTransition;
    transformOrigin: string;
  };
  media: {
    animate: MotionKeyframes;
    transition: MotionTransition;
    transformOrigin: string;
  };
  shadow: {
    animate: MotionKeyframes;
    transition: MotionTransition;
  };
}

function getStickerTone(stickerId: string): StickerTone {
  return /sunflower|cupcake|octopus|hedgehog|raccoon|dragon|lion|crab|angry/.test(stickerId)
    ? "angry"
    : /pear|pig|bunny|whale|deer|snail|cry/.test(stickerId)
      ? "sad"
      : /coffee|potato|penguin|owl|koala|bear|sloth|turtle|elephant|jellyfish|sleepy/.test(stickerId)
        ? "sleepy"
        : /cat-love|puppy|unicorn|butterfly|seahorse|dolphin|love/.test(stickerId)
          ? "love"
          : /sushi|toast|hamster|carrot|duck|donut|panda|cherry|chick|frog|cookie|icecream|bee|clownfish|squid|happy|surprised|cool/.test(stickerId)
            ? "happy"
            : /tomato|beet|mushroom|lemon|strawberry|avocado|fox|watermelon|giraffe|ladybug|starfish|shy/.test(stickerId)
              ? "shy"
              : "float";
}

function loop(duration: number, delay: number, repeatDelay: number): MotionTransition {
  return {
    duration,
    repeat: Infinity,
    ease: "easeInOut",
    delay,
    repeatDelay,
  };
}

export function getStickerMotionSpec(
  stickerId: string,
  options: { large?: boolean; index?: number } = {}
): StickerMotionSpec {
  const large = options.large ?? false;
  const index = options.index ?? 0;
  const normalizedId = stickerId.toLowerCase();
  const tone = getStickerTone(normalizedId);
  const lift = large ? 1.3 : 1;
  const delay = Math.min(index * (large ? 0.035 : 0.08), large ? 0.18 : 0.32);
  const repeatDelay = large ? 0.16 : 0.26;

  if (/sushi/.test(normalizedId)) {
    const duration = large ? 1.35 : 1.55;
    return {
      wrapper: {
        animate: {
          x: [0, 12 * lift, -11 * lift, 7 * lift, 0],
          y: [0, -12 * lift, 2 * lift, -8 * lift, 0],
          rotate: [0, -16, 13, -8, 0],
          scaleX: [1, 0.92, 1.08, 0.97, 1],
          scaleY: [1, 1.08, 0.93, 1.03, 1],
        },
        transition: loop(duration, delay, repeatDelay),
        transformOrigin: "center 68%",
      },
      media: {
        animate: {
          rotate: [0, 5, -6, 3, 0],
          y: [0, -1.4 * lift, 0],
          scale: [1, 1.02, 1, 1.01, 1],
        },
        transition: loop(duration, delay, repeatDelay),
        transformOrigin: "center 62%",
      },
      shadow: {
        animate: {
          scaleX: [0.58, 1.35, 0.54, 1.14, 0.58],
          opacity: [0.16, 0.06, 0.19, 0.08, 0.16],
        },
        transition: loop(duration, delay, repeatDelay),
      },
    };
  }

  let duration = large ? 1.6 : 2.08;
  let wrapperAnimate: MotionKeyframes = { y: [0, -8 * lift, 0, -4 * lift, 0], rotate: [0, -4, 4, 0], scale: [1, 1.05, 1, 1.02, 1] };
  let mediaAnimate: MotionKeyframes = { rotate: [0, -3, 3, 0], y: [0, -1 * lift, 0] };
  let shadowAnimate: MotionKeyframes = { scaleX: [0.74, 1.2, 0.74], opacity: [0.16, 0.08, 0.16] };

  switch (tone) {
    case "angry":
      duration = large ? 0.95 : 1.24;
      wrapperAnimate = {
        y: [0, -5.5 * lift, 0, -2.5 * lift, 0],
        x: [0, -4.5 * lift, 4.5 * lift, -3 * lift, 3 * lift, 0],
        rotate: [0, -4, 4, -2, 2, 0],
        scaleX: [1, 1.04, 0.96, 1.02, 1],
        scaleY: [1, 0.97, 1.07, 0.98, 1],
      };
      mediaAnimate = { rotate: [0, -7, 7, -5, 4, 0], y: [0, -1.5 * lift, 0] };
      break;
    case "sad":
      duration = large ? 1.6 : 2.08;
      wrapperAnimate = { y: [0, 2 * lift, 0, -2 * lift, 0], rotate: [0, -4, 0, 4, 0], scale: [1, 0.97, 1, 1.02, 1] };
      mediaAnimate = { rotate: [0, -3, 0, 3, 0], y: [0, 1, 0] };
      break;
    case "sleepy":
      duration = large ? 2.2 : 2.86;
      wrapperAnimate = { y: [0, -4 * lift, 0, -2 * lift, 0], rotate: [0, -3, 2, -1, 0], scale: [1, 1.05, 1, 1.02, 1] };
      mediaAnimate = { rotate: [0, -4, 2, -1, 0], scale: [1, 1.03, 1, 1.01, 1] };
      shadowAnimate = { scaleX: [0.82, 1.1, 0.82], opacity: [0.16, 0.1, 0.16] };
      break;
    case "love":
      duration = large ? 1.45 : 1.89;
      wrapperAnimate = { y: [0, -9 * lift, 0, -4 * lift, 0], rotate: [0, -3, 3, 0], scale: [1, 1.09, 1, 1.04, 1] };
      mediaAnimate = { rotate: [0, -4, 4, 0], scale: [1, 1.07, 1, 1.04, 1] };
      break;
    case "happy":
      duration = large ? 1.15 : 1.5;
      wrapperAnimate = {
        y: [0, -13 * lift, 0, -7 * lift, 0],
        rotate: [0, -4, 4, -2, 0],
        scaleX: [1, 1.07, 0.93, 1.05, 1],
        scaleY: [1, 0.94, 1.1, 0.97, 1],
      };
      mediaAnimate = { rotate: [0, -4, 4, -2, 0], y: [0, -1.5 * lift, 0], scale: [1, 1.04, 1, 1.02, 1] };
      shadowAnimate = { scaleX: [0.65, 1.36, 0.58, 1.18, 0.65], opacity: [0.18, 0.05, 0.2, 0.08, 0.18] };
      break;
    case "shy":
      duration = large ? 1.6 : 2.08;
      wrapperAnimate = { y: [0, -6 * lift, 0, -3 * lift, 0], rotate: [0, -5, 5, -2, 0], scale: [1, 1.04, 1, 1.02, 1] };
      mediaAnimate = { rotate: [0, -3, 3, 0], scale: [1, 1.03, 1] };
      break;
    default:
      break;
  }

  return {
    wrapper: {
      animate: wrapperAnimate,
      transition: loop(duration, delay, repeatDelay),
      transformOrigin: "center bottom",
    },
    media: {
      animate: mediaAnimate,
      transition: loop(duration, delay, repeatDelay),
      transformOrigin: "center bottom",
    },
    shadow: {
      animate: shadowAnimate,
      transition: loop(duration, delay, repeatDelay),
    },
  };
}