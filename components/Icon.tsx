import React from 'react';
import { Svg, Path, Circle, Rect, G } from 'react-native-svg';

// Hand-built stroke icon set ported from source/ui.jsx `Icon`.
export type IconName =
  | 'explore' | 'themes' | 'feed' | 'buddy' | 'saved' | 'back' | 'close'
  | 'chevron' | 'search' | 'pin' | 'star' | 'heart' | 'up' | 'comment'
  | 'clock' | 'won' | 'globe' | 'sparkle' | 'translate' | 'check' | 'plus'
  | 'arrow' | 'filter' | 'walk' | 'route' | 'info' | 'user' | 'trophy'
  | 'lock' | 'bolt' | 'settings' | 'share' | 'edit' | 'refresh';

type Props = {
  name: IconName;
  size?: number;
  stroke?: string;
  fill?: string;
  sw?: number;
};

const paths: Record<IconName, (p: { stroke: string; sw: number }) => React.ReactNode> = {
  explore: () => (<><Circle cx={12} cy={12} r={9} /><Path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" /></>),
  themes: () => (<><Path d="M4 5h16v14H4z" /><Path d="M8 5v14M16 5v14M4 9.5h4M16 9.5h4M4 14.5h4M16 14.5h4" /></>),
  feed: () => <Path d="M4 6h16M4 12h16M4 18h10" />,
  buddy: () => (<><Circle cx={9} cy={8} r={3} /><Path d="M3.5 19a5.5 5.5 0 0111 0" /><Path d="M16 6.5a3 3 0 010 5.6M20.5 19a5.2 5.2 0 00-3.2-4.8" /></>),
  saved: () => <Path d="M6 4h12v16l-6-4-6 4V4z" />,
  back: () => <Path d="M15 5l-7 7 7 7" />,
  close: () => <Path d="M6 6l12 12M18 6L6 18" />,
  chevron: () => <Path d="M9 6l6 6-6 6" />,
  search: () => (<><Circle cx={11} cy={11} r={7} /><Path d="M20 20l-3.5-3.5" /></>),
  pin: () => (<><Path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" /><Circle cx={12} cy={10} r={2.4} /></>),
  star: () => <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />,
  heart: () => <Path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0112 7a3.9 3.9 0 017 3.6C19 15.4 12 20 12 20z" />,
  up: () => <Path d="M12 5l7 8h-4v6H9v-6H5l7-8z" />,
  comment: () => <Path d="M4 5h16v11H9l-5 4V5z" />,
  clock: () => (<><Circle cx={12} cy={12} r={8.5} /><Path d="M12 7v5l3.2 2" /></>),
  won: () => <Path d="M5 7l2.5 9L12 8l4.5 8L19 7M4 11h16" />,
  globe: () => (<><Circle cx={12} cy={12} r={9} /><Path d="M3 12h18M12 3c2.6 2.4 4 5.6 4 9s-1.4 6.6-4 9c-2.6-2.4-4-5.6-4-9s1.4-6.6 4-9z" /></>),
  sparkle: () => <Path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3z" />,
  refresh: () => <Path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 3v6h-6" />,
  translate: () => (<><Path d="M4 6h9M8.5 4v2M10.5 6c-.6 4-3 6.5-6 8M6 9.5c1 2.2 3 3.5 5.5 4.2" /><Path d="M13 20l4-9 4 9M14.4 17h5.2" /></>),
  check: () => <Path d="M5 12.5l4.5 4.5L19 7" />,
  plus: () => <Path d="M12 5v14M5 12h14" />,
  arrow: () => <Path d="M5 12h14M13 6l6 6-6 6" />,
  filter: () => <Path d="M4 6h16M7 12h10M10 18h4" />,
  walk: () => (<><Circle cx={13} cy={4.5} r={1.6} /><Path d="M11 9l-2 4 2 2 1 5M13 8l3 2 3-1M9 13l-3 1-1 4" /></>),
  route: () => (<><Circle cx={6} cy={6} r={2.2} /><Circle cx={18} cy={18} r={2.2} /><Path d="M8 6h6a3 3 0 010 6h-4a3 3 0 000 6h6" /></>),
  info: () => (<><Circle cx={12} cy={12} r={9} /><Path d="M12 11v5M12 7.6v.1" /></>),
  user: () => (<><Circle cx={12} cy={8.5} r={3.6} /><Path d="M5 19.5a7 7 0 0114 0" /></>),
  trophy: () => (<><Path d="M7 4h10v4a5 5 0 01-10 0V4z" /><Path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3M9 19h6M10 15.5V19M14 15.5V19" /></>),
  lock: () => (<><Rect x={5} y={11} width={14} height={9} rx={2} /><Path d="M8 11V8a4 4 0 018 0v3" /></>),
  bolt: () => <Path d="M13 3L5 13h6l-1 8 8-10h-6l1-8z" />,
  settings: () => (<><Circle cx={12} cy={12} r={3.2} /><Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  share: () => (<><Circle cx={18} cy={5} r={2.5} /><Circle cx={6} cy={12} r={2.5} /><Circle cx={18} cy={19} r={2.5} /><Path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" /></>),
  edit: () => <Path d="M14.5 4.5l5 5M17 3a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L17 3z" />,
};

export function Icon({ name, size = 24, stroke = '#000', fill = 'none', sw = 1.8 }: Props) {
  const render = paths[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <G
        stroke={stroke}
        strokeWidth={sw}
        fill={fill}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {render ? render({ stroke, sw }) : null}
      </G>
    </Svg>
  );
}
