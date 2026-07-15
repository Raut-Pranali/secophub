import { useEffect, useState } from "react";
import api from "../services/api";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6"];
const STATUSES = ["Open", "In Progress", "Resolved", "Closed"];

export default function StatusChart({ loading: parentLoading }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/api/vulnerabilities");
      const vulns = res.data.vulnerabilities || [];
      const counts = { Open: 0, "In Progress": 0, Resolved: 0, Closed: 0 };
      vulns.forEach((v) => {
        const s = v.status || "Open";
        counts[s] !== undefined ? counts[s]++ : counts.Open++;
      });
      setData(
        STATUSES.map((name) => ({ name, value: counts[name] })).filter(
          (d) => d.value > 0
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || parentLoading) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4b5563",
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ position: "relative", width: "100%", height: 200 }}>
      <PieChart width={300} height={200} style={{ margin: "0 auto" }}>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={3}
          startAngle={90}
          endAngle={-270}
          cx="50%"
          cy="45%"
        >
          {data.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
              strokeWidth={0}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "#141420",
            border: "1px solid #2a2a38",
            borderRadius: 8,
            fontSize: 12,
          }}
          itemStyle={{ color: "#cbd5e1" }}
        />
        <Legend
          iconType="circle"
          iconSize={7}
          formatter={(value, entry) => (
            <span style={{ color: "#6b7280", fontSize: 11 }}>
              {value} ({entry.payload.value})
            </span>
          )}
        />
      </PieChart>

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 155,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>
          {total}
        </span>
        <span style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>
          total
        </span>
      </div>
    </div>
  );
}