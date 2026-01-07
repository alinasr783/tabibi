/**
 * ChartRenderer Component
 * يعرض الرسومات البيانية المختلفة (خطي، عمودي، دائري)
 */

import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend
} from 'recharts';
import { Card } from "../../components/ui/card";
import { motion } from "framer-motion";
import ChartContainer from "../../components/ui/ChartContainer";

// ألوان عصرية للرسومات
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

/**
 * Line Chart Component - رسم بياني خطي
 */
export function LineChartRenderer({ data, title, height = 300 }) {
  if (!data?.datasets || !data?.labels) {
    return <p className="text-sm text-muted-foreground">مفيش بيانات كافية للرسم البياني</p>;
  }

  // Transform data for Recharts format
  const chartData = data.labels.map((label, index) => {
    const point = { name: label };
    data.datasets.forEach((dataset, i) => {
      point[dataset.label || `Series ${i + 1}`] = dataset.data[index] || 0;
    });
    return point;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-4 sm:p-6">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-right">
            {title}
          </h3>
        )}
        <ChartContainer minHeight={height}>
          {({ width, height: chartHeight }) => (
            <LineChart width={width} height={chartHeight} data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="line"
              />
              {data.datasets.map((dataset, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={dataset.label || `Series ${index + 1}`}
                  stroke={dataset.color || COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ChartContainer>
      </Card>
    </motion.div>
  );
}

/**
 * Bar Chart Component - رسم بياني عمودي
 */
export function BarChartRenderer({ data, title, height = 300 }) {
  if (!data?.datasets || !data?.labels) {
    return <p className="text-sm text-muted-foreground">مفيش بيانات كافية للرسم البياني</p>;
  }

  // Transform data for Recharts format
  const chartData = data.labels.map((label, index) => {
    const point = { name: label };
    data.datasets.forEach((dataset, i) => {
      point[dataset.label || `Series ${i + 1}`] = dataset.data[index] || 0;
    });
    return point;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-4 sm:p-6">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-right">
            {title}
          </h3>
        )}
        <ChartContainer minHeight={height}>
          {({ width, height: chartHeight }) => (
            <BarChart width={width} height={chartHeight} data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="square"
              />
              {data.datasets.map((dataset, index) => (
                <Bar
                  key={index}
                  dataKey={dataset.label || `Series ${index + 1}`}
                  fill={dataset.color || COLORS[index % COLORS.length]}
                  radius={[8, 8, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          )}
        </ChartContainer>
      </Card>
    </motion.div>
  );
}

/**
 * Pie Chart Component - رسم بياني دائري
 */
export function PieChartRenderer({ data, title, height = 300 }) {
  if (!data?.datasets || !data?.labels) {
    return <p className="text-sm text-muted-foreground">مفيش بيانات كافية للرسم البياني</p>;
  }

  // Use first dataset for pie chart
  const dataset = data.datasets[0];
  const chartData = data.labels.map((label, index) => ({
    name: label,
    value: dataset.data[index] || 0
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="p-4 sm:p-6">
        {title && (
          <h3 className="text-base sm:text-lg font-semibold mb-4 text-right">
            {title}
          </h3>
        )}
        <ChartContainer minHeight={height}>
          {({ width, height: chartHeight }) => (
            <PieChart width={width} height={chartHeight}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
            </PieChart>
          )}
        </ChartContainer>
      </Card>
    </motion.div>
  );
}

/**
 * Main Chart Renderer - يختار النوع المناسب
 */
export default function ChartRenderer({ chartData }) {
  if (!chartData || !chartData.chartType) {
    return null;
  }

  const { chartType, title, ...data } = chartData;

  switch (chartType.toLowerCase()) {
    case 'line':
      return <LineChartRenderer data={data} title={title} />;
    case 'bar':
      return <BarChartRenderer data={data} title={title} />;
    case 'pie':
      return <PieChartRenderer data={data} title={title} />;
    default:
      return <LineChartRenderer data={data} title={title} />;
  }
}
