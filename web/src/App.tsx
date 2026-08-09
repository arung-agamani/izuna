import { Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Legacy
import LegacyHome from "./routes/Home";
import Login from "./routes/Login";
import Test from "./routes/Test";
import Main from "./routes/closure/Main";
import Tags from "./routes/closure/Tags";
import Guilds from "./routes/closure/Guilds";
import Reminder from "./routes/closure/Reminder";
import ReminderDetails from "./routes/closure/Reminder/Details";
import ProfilePage from "./routes/profile/Profile";
import ProtectedRoute from "./components/ProtectedRoute";
import LegacyLayout from "./components/LegacyLayout";

// Fan site
import FanLayout from "./routes/fan/Main";
import FanHome from "./routes/fan/Home";
import FanLore from "./routes/fan/Lore";

// Dashboard
import DashLayout from "./routes/dash/Main";
import DashHome from "./routes/dash/Home";
import DashTags from "./routes/dash/Tags";

import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient({
    defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Routes>
                {/* ── Fan Site — character appreciation, game-like, full-bleed ── */}
                <Route element={<FanLayout />}>
                    <Route index element={<FanHome />} />
                    <Route path="lore" element={<FanLore />} />
                    <Route path="media" element={<p className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>Media archives coming soon —nin!</p>} />
                    <Route path="fanarts" element={<p className="text-center py-16" style={{ color: "var(--color-text-secondary)" }}>Fanart gallery coming soon —nin!</p>} />
                </Route>

                {/* ── Dashboard — bot management, tags, reminders ── */}
                <Route path="dash" element={<DashLayout />}>
                    <Route index element={<DashHome />} />
                    <Route path="tags" element={<DashTags />} />
                    <Route path="reminders" element={<p className="text-gray-400">Reminders coming soon.</p>} />
                </Route>

                {/* ── Legacy routes — old layout with Navbar + container ── */}
                <Route element={<LegacyLayout />}>
                    <Route path="home" element={<LegacyHome />} />
                    <Route path="login" element={<Login />} />
                    <Route path="test" element={<Test />} />
                    <Route element={<ProtectedRoute />}>
                        <Route path="closure" element={<Main />}>
                            <Route index element={<p>Please select above menu</p>} />
                            <Route path="tags" element={<Tags />} />
                            <Route path="guilds" element={<Guilds />} />
                            <Route path="reminder">
                                <Route index element={<Reminder />} />
                                <Route path=":id" element={<ReminderDetails />} />
                            </Route>
                            <Route path="*" element={<p>Menu non existent</p>} />
                        </Route>
                        <Route path="profile">
                            <Route index element={<ProfilePage />} />
                        </Route>
                    </Route>
                </Route>
            </Routes>
            {import.meta.env.DEV && <ReactQueryDevtools />}
        </QueryClientProvider>
    );
}

export default App;
