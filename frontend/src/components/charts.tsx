import type { AnalysisResult, TopicCluster, ForecastPoint } from '../types';

import { averageEmotionRadarData, primaryEmotionDistribution, sentimentTimeline } from '../lib/analysis';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { Panel, Badge } from './ui';

export function EmotionRadarPanel({ results }: { results: AnalysisResult[] }) {
  const data = averageEmotionRadarData(results);

  return (
    <Panel title="Emotion Radar" subtitle="Average emotion profile across the current selection.">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="emotion" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} />
            <PolarRadiusAxis tick={{ fill: '#64748b', fontSize: 10 }} stroke="rgba(255,255,255,0.1)" />
            <Radar dataKey="score" stroke="#00ff88" fill="#00ff88" fillOpacity={0.16} dot={{ r: 3, fill: '#00ff88' }} />
            <Tooltip
              contentStyle={{
                background: '#0f1115',
                border: '1px solid #2a2d33',
                borderRadius: '16px',
                color: '#e2e8f0'
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function EmotionDistributionPanel({ results }: { results: AnalysisResult[] }) {
  const data = primaryEmotionDistribution(results);

  return (
    <Panel title="Primary Emotion Distribution" subtitle="How the dominant emotion is distributed across the batch.">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="emotion" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: '#0f1115',
                border: '1px solid #2a2d33',
                borderRadius: '16px',
                color: '#e2e8f0'
              }}
            />
            <Bar dataKey="count" fill="#00ff88" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function SentimentTimelinePanel({ results }: { results: AnalysisResult[] }) {
  const data = sentimentTimeline(results);

  return (
    <Panel title="Sentiment Timeline" subtitle="Sentiment progression across the selected reviews.">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="index" minTickGap={40} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis domain={[-1, 1]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#0f1115',
                border: '1px solid #2a2d33',
                borderRadius: '16px',
                color: '#e2e8f0'
              }}
              formatter={(value: number) => value.toFixed(3)}
            />
            <Line
              type="monotone"
              dataKey="sentiment"
              stroke="#00ff88"
              strokeWidth={data.length < 500 ? 3 : 1.5}
              dot={data.length < 300 ? { r: 3.5, fill: '#00ff88' } : false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function TopicModelingPanel({ topics }: { topics: TopicCluster[] }) {
  return (
    <Panel title="Semantic Topic Clusters (LDA)" subtitle="Statistical keyword grouping of batch themes.">
      <div className="space-y-5 py-2">
        {topics.map((topic) => (
          <div key={topic.topicId} className="space-y-2">
            <div className="flex items-start justify-between text-xs font-semibold">
              <span className="text-sentix-text uppercase tracking-wider">Topic #{topic.topicId}</span>
              <span className="text-sentix-muted">
                {topic.count} reviews ({Math.round(topic.percentage * 100)}%)
              </span>
            </div>
            
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <div 
                className="h-full rounded-full bg-cyan-400 transition-all duration-500" 
                style={{ width: `${Math.max(topic.percentage * 100, 4)}%` }} 
              />
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {topic.keywords.map((word) => (
                <Badge key={word} className="border-cyan-400/25 bg-cyan-500/5 text-cyan-200 text-[10px]">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ForecastTimelinePanel({ forecast }: { forecast: ForecastPoint[] }) {
  const historyPoints = forecast.filter((f) => !f.isForecast);
  const maxHistoryIndex = historyPoints.length > 0 ? Math.max(...historyPoints.map((f) => f.index)) : 0;

  const chartData = forecast.map((f) => ({
    index: f.index,
    history: f.isForecast ? null : f.sentiment,
    forecast: f.isForecast || f.index === maxHistoryIndex ? f.sentiment : null
  }));

  return (
    <Panel title="Sentiment Trend Forecasting" subtitle="Linear projection of review sentiment trajectory.">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="index" minTickGap={40} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <YAxis domain={[-1, 1]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: '#0f1115',
                border: '1px solid #2a2d33',
                borderRadius: '16px',
                color: '#e2e8f0'
              }}
              formatter={(value: number) => (value !== null && value !== undefined ? value.toFixed(3) : '')}
            />
            {/* History line (Solid Green) */}
            <Line 
              type="monotone" 
              dataKey="history" 
              stroke="#00ff88" 
              strokeWidth={chartData.length < 500 ? 3 : 1.5} 
              dot={chartData.length < 300 ? { r: 3.5, fill: '#00ff88' } : false} 
              activeDot={{ r: 5 }} 
              connectNulls={false}
            />
            {/* Forecast line (Dashed Cyan) */}
            <Line 
              type="monotone" 
              dataKey="forecast" 
              stroke="#38bdf8" 
              strokeWidth={chartData.length < 500 ? 2.5 : 1.5} 
              strokeDasharray="6 6" 
              dot={chartData.length < 300 ? { r: 3.5, fill: '#38bdf8' } : false} 
              activeDot={{ r: 4 }} 
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
