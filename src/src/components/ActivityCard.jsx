import { Link } from "react-router-dom";

export default function ActivityCard({ activity }) {
  return (
    <div className="card activity-card">
      <div className="activity-top">
        <div>
          <div className="activity-title">{activity.title}</div>
          <div className="muted activity-meta">
            {activity.type} • {activity.unit} • {activity.location}
          </div>
        </div>

        <div className="activity-badges">
          <span className="badge">{activity.status}</span>
        </div>
      </div>

      <div className="activity-bottom">
        <div className="muted">Ngày: {activity.date}</div>
        <Link className="btn btn-outline" to={`/activities/${activity.id}`}>
          Xem chi tiết
        </Link>
      </div>
    </div>
  );
}
