import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Enterprises from "@/pages/Enterprises";
import DataEntry from "@/pages/DataEntry";
import Attachments from "@/pages/Attachments";
import Audit from "@/pages/Audit";
import Results from "@/pages/Results";
import Analysis from "@/pages/Analysis";
import FactorConfig from "@/pages/FactorConfig";
import ReportArchive from "@/pages/ReportArchive";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/enterprises" element={<Enterprises />} />
          <Route path="/data-entry" element={<DataEntry />} />
          <Route path="/attachments" element={<Attachments />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/results" element={<Results />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/factor-config" element={<FactorConfig />} />
          <Route path="/report-archive" element={<ReportArchive />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
