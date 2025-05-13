'use client'

import React from 'react';
import { Clock, Coins, Timer, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GaugeProps extends Omit<React.SVGProps<SVGSVGElement>, 'className'> {
  value: number;
  size?: number | string;
  gapPercent?: number;
  strokeWidth?: number;
  equal?: boolean;
  showValue?: boolean;
  primary?: 'danger' | 'warning' | 'success' | 'info' | string | { [key: number]: string };
  secondary?: 'danger' | 'warning' | 'success' | 'info' | string | { [key: number]: string };
  transition?: {
    length?: number;
    step?: number;
    delay?: number;
  };
  className?:
    | string
    | {
        svgClassName?: string;
        primaryClassName?: string;
        secondaryClassName?: string;
        textClassName?: string;
      };
}

function Gauge({
  value,
  size = '100%',
  gapPercent = 5,
  strokeWidth = 10,
  equal = false,
  showValue = true,
  primary,
  secondary,
  transition = {
    length: 1000,
    step: 200,
    delay: 0
  },
  className,
  ...props
}: GaugeProps) {
  const strokePercent = value;
  const circleSize = 100;
  const radius = circleSize / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const percentToDegree = 360 / 100;
  const percentToPx = circumference / 100;
  const offsetFactor = equal ? 0.5 : 0;
  const offsetFactorSecondary = 1 - offsetFactor;

  const primaryStrokeDasharray = () => {
    if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
      const subtract = -strokePercent + 100;
      return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
    } else {
      const subtract = gapPercent * 2 * offsetFactor;
      return `${Math.max(strokePercent * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
    }
  };

  const secondaryStrokeDasharray = () => {
    if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
      const subtract = strokePercent;
      return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
    } else {
      const subtract = gapPercent * 2 * offsetFactorSecondary;
      return `${Math.max((100 - strokePercent) * percentToPx - subtract * percentToPx, 0)} ${circumference}`;
    }
  };

  const primaryTransform = () => {
    if (offsetFactor > 0 && strokePercent > 100 - gapPercent * 2 * offsetFactor) {
      const add = 0.5 * (-strokePercent + 100);
      return `rotate(${-90 + add * percentToDegree}deg)`;
    } else {
      const add = gapPercent * offsetFactor;
      return `rotate(${-90 + add * percentToDegree}deg)`;
    }
  };

  const secondaryTransform = () => {
    if (offsetFactorSecondary < 1 && strokePercent < gapPercent * 2 * offsetFactorSecondary) {
      const subtract = 0.5 * strokePercent;
      return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`;
    } else {
      const subtract = gapPercent * offsetFactorSecondary;
      return `rotate(${360 - 90 - subtract * percentToDegree}deg) scaleY(-1)`;
    }
  };

  const primaryStroke = () => {
    if (!primary) {
      return strokePercent <= 25
        ? '#dc2626'
        : strokePercent <= 50
          ? '#f59e0b'
          : strokePercent <= 75
            ? '#3b82f6'
            : '#22c55e';
    } else if (typeof primary === 'string') {
      return primary === 'danger'
        ? '#dc2626'
        : primary === 'warning'
          ? '#f59e0b'
          : primary === 'info'
            ? '#3b82f6'
            : primary === 'success'
              ? '#22c55e'
              : primary;
    } else if (typeof primary === 'object') {
      const primaryKeys = Object.keys(primary).sort((a, b) => Number(a) - Number(b));
      let primaryStroke = '';
      for (let i = 0; i < primaryKeys.length; i++) {
        const currentKey = Number(primaryKeys[i]);
        const nextKey = Number(primaryKeys[i + 1]);

        if (strokePercent >= currentKey && (strokePercent < nextKey || !nextKey)) {
          primaryStroke = primary[currentKey] || '';

          if (['danger', 'warning', 'success', 'info'].includes(primaryStroke)) {
            primaryStroke = {
              danger: '#dc2626',
              warning: '#f59e0b',
              info: '#3b82f6',
              success: '#22c55e'
            }[primaryStroke] || primaryStroke;
          }

          break;
        }
      }
      return primaryStroke;
    }
  };

  const secondaryStroke = () => {
    if (!secondary) {
      return '#9ca3af';
    } else if (typeof secondary === 'string') {
      return secondary === 'danger'
        ? '#fecaca'
        : secondary === 'warning'
          ? '#fde68a'
          : secondary === 'info'
            ? '#bfdbfe'
            : secondary === 'success'
              ? '#bbf7d0'
              : secondary;
    } else if (typeof secondary === 'object') {
      const stroke_percent_secondary = 100 - strokePercent;
      const secondaryKeys = Object.keys(secondary).sort((a, b) => Number(a) - Number(b));
      let secondaryStroke = '';

      for (let i = 0; i < secondaryKeys.length; i++) {
        const currentKey = Number(secondaryKeys[i]);
        const nextKey = Number(secondaryKeys[i + 1]);

        if (stroke_percent_secondary >= currentKey && (stroke_percent_secondary < nextKey || !nextKey)) {
          secondaryStroke = secondary[currentKey] || '';

          if (['danger', 'warning', 'success', 'info'].includes(secondaryStroke)) {
            secondaryStroke = {
              danger: '#fecaca',
              warning: '#fde68a',
              info: '#bfdbfe',
              success: '#bbf7d0'
            }[secondaryStroke] || secondaryStroke;
          }

          break;
        }
      }
      return secondaryStroke;
    }
  };

  const primaryOpacity = () => {
    if (
      offsetFactor > 0 &&
      strokePercent < gapPercent * 2 * offsetFactor &&
      strokePercent < gapPercent * 2 * offsetFactorSecondary
    ) {
      return 0;
    } else return 1;
  };

  const secondaryOpacity = () => {
    if (
      (offsetFactor === 0 && strokePercent > 100 - gapPercent * 2) ||
      (offsetFactor > 0 &&
        strokePercent > 100 - gapPercent * 2 * offsetFactor &&
        strokePercent > 100 - gapPercent * 2 * offsetFactorSecondary)
    ) {
      return 0;
    } else return 1;
  };

  const circleStyles: React.CSSProperties = {
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeDashoffset: 0,
    strokeWidth: strokeWidth,
    transition: `all ${transition?.length}ms ease ${transition?.delay}ms`,
    transformOrigin: '50% 50%',
    shapeRendering: 'geometricPrecision'
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${circleSize} ${circleSize}`}
      shapeRendering="crispEdges"
      width={size}
      height={size}
      style={{ userSelect: 'none' }}
      strokeWidth={2}
      fill="none"
      className={cn('', typeof className === 'string' ? className : className?.svgClassName)}
      {...props}
    >
      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        style={{
          ...circleStyles,
          strokeDasharray: secondaryStrokeDasharray(),
          transform: secondaryTransform(),
          stroke: secondaryStroke(),
          opacity: secondaryOpacity()
        }}
        className={cn('', typeof className === 'object' && className?.secondaryClassName)}
      />

      <circle
        cx={circleSize / 2}
        cy={circleSize / 2}
        r={radius}
        style={{
          ...circleStyles,
          strokeDasharray: primaryStrokeDasharray(),
          transform: primaryTransform(),
          stroke: primaryStroke(),
          opacity: primaryOpacity()
        }}
        className={cn('', typeof className === 'object' && className?.primaryClassName)}
      />

      {showValue && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          alignmentBaseline="central"
          fill="currentColor"
          fontSize={36}
          className={cn('font-semibold', typeof className === 'object' && className?.textClassName)}
        >
          {Math.round(strokePercent)}
        </text>
      )}
    </svg>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  gaugeValue?: number;
}

function MetricCard({ title, value, icon, trend, gaugeValue }: MetricCardProps) {
  return (
    <div className="flex gap-0 flex-col justify-between p-6 border border-border rounded-xl bg-background">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-md bg-primary/10 text-primary">{icon}</div>
        {gaugeValue !== undefined && (
          <div className="w-16 h-16">
            <Gauge size="100%" value={gaugeValue} primary="primary" strokeWidth={8} />
          </div>
        )}
      </div>
      <h2 className="text-3xl tracking-tighter font-medium text-foreground">{value}</h2>
      <div className="flex justify-between items-end mt-2">
        <p className="text-sm text-muted-foreground">{title}</p>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.positive ? 'text-success' : 'text-destructive'
            )}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

interface AdminDashboardProps {
  tokensMinted: number;
  totalSolDonated: number;
  totalTBHFMinted: number;
  raffleCountdown: number;
  timeSinceLastDraw: string;
}

function AdminDashboard({
  tokensMinted,
  totalSolDonated,
  totalTBHFMinted,
  raffleCountdown,
  timeSinceLastDraw
}: AdminDashboardProps) {
  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Raffle Dashboard</h1>
        <p className="text-muted-foreground">Monitor your raffle metrics and performance</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Tokens Minted Toward Next Raffle"
          value={tokensMinted.toLocaleString()}
          icon={<Zap className="w-5 h-5" />}
          gaugeValue={Math.min((tokensMinted / raffleCountdown) * 100, 100)}
        />
        
        <MetricCard
          title="Total SOL Donated"
          value={`${totalSolDonated.toLocaleString()} SOL`}
          icon={<Coins className="w-5 h-5" />}
          trend={{ value: "12.5%", positive: true }}
        />
        
        <MetricCard
          title="Total TBHF Tokens Minted"
          value={totalTBHFMinted.toLocaleString()}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={{ value: "8.3%", positive: true }}
        />
        
        <MetricCard
          title="Raffle Countdown (Tokens Remaining)"
          value={raffleCountdown.toLocaleString()}
          icon={<Timer className="w-5 h-5" />}
          gaugeValue={100 - Math.min((tokensMinted / raffleCountdown) * 100, 100)}
        />
        
        <MetricCard
          title="Time Since Last Draw"
          value={timeSinceLastDraw}
          icon={<Clock className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}

const Page = () => {
  // Example data - in a real application, this would come from your API or state management
  return (
    <AdminDashboard
      tokensMinted={75000}
      totalSolDonated={1250.75}
      totalTBHFMinted={125000}
      raffleCountdown={222222}
      timeSinceLastDraw="2d 14h 35m"
    />
  );
}

export default Page;