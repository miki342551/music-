import './Skeleton.css'

function Skeleton({ type = 'text', count = 1, className = '' }) {
    const renderSkeleton = () => {
        switch (type) {
            case 'track':
                return (
                    <div className="skeleton-track">
                        <div className="skeleton-thumb shimmer" />
                        <div className="skeleton-info">
                            <div className="skeleton-title shimmer" />
                            <div className="skeleton-subtitle shimmer" />
                        </div>
                    </div>
                )
            case 'card':
                return (
                    <div className="skeleton-card">
                        <div className="skeleton-card-image shimmer" />
                        <div className="skeleton-card-title shimmer" />
                        <div className="skeleton-card-subtitle shimmer" />
                    </div>
                )
            case 'text':
            default:
                return <div className={`skeleton-text shimmer ${className}`} />
        }
    }

    return (
        <div className="skeleton-container">
            {Array(count).fill(0).map((_, i) => (
                <div key={i}>{renderSkeleton()}</div>
            ))}
        </div>
    )
}

export default Skeleton
