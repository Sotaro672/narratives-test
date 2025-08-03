import React, { useState, useEffect } from 'react';
import './NewsField.css';

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  date: string;
  category: string;
  imageUrl?: string;
}

const NewsField: React.FC = () => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ニュースデータの模擬取得
    const fetchNews = async () => {
      setLoading(true);
      // 実際のAPIコール用の遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockNews: NewsItem[] = [
        {
          id: 1,
          title: "Welcome to Narratives CRM",
          summary: "Discover the power of our customer relationship management system designed to streamline your business operations.",
          date: "2025-07-25",
          category: "Product Update",
          imageUrl: "https://placehold.co/300x200/4F46E5/white?text=CRM"
        },
        {
          id: 2,
          title: "New Features Released",
          summary: "We've added advanced analytics, custom reporting, and enhanced security features to improve your experience.",
          date: "2025-07-24",
          category: "Feature Release",
          imageUrl: "https://placehold.co/300x200/06B6D4/white?text=Features"
        },
        {
          id: 3,
          title: "Customer Success Stories",
          summary: "Learn how businesses like yours have increased productivity by 40% using our CRM solution.",
          date: "2025-07-23",
          category: "Success Story",
          imageUrl: "https://placehold.co/300x200/10B981/white?text=Success"
        },
        {
          id: 4,
          title: "Data Security & Privacy",
          summary: "Your data security is our priority. Learn about our latest security measures and compliance standards.",
          date: "2025-07-22",
          category: "Security",
          imageUrl: "https://placehold.co/300x200/F59E0B/white?text=Security"
        },
        {
          id: 5,
          title: "Integration Capabilities",
          summary: "Connect with over 100+ popular business tools and streamline your workflow with seamless integrations.",
          date: "2025-07-21",
          category: "Integration",
          imageUrl: "https://placehold.co/300x200/8B5CF6/white?text=API"
        }
      ];
      
      setNewsItems(mockNews);
      setLoading(false);
    };

    fetchNews();
  }, []);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      "Product Update": "#4F46E5",
      "Feature Release": "#06B6D4",
      "Success Story": "#10B981",
      "Security": "#F59E0B",
      "Integration": "#8B5CF6"
    };
    return colors[category] || "#6B7280";
  };

  if (loading) {
    return (
      <div className="newsfield">
        <div className="newsfield-header">
          <h2>Latest News & Updates</h2>
          <p>Stay informed about the latest developments</p>
        </div>
        <div className="news-loading">
          <div className="loading-spinner"></div>
          <p>Loading latest news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="newsfield">
      <div className="newsfield-header">
        <h2>Latest News & Updates</h2>
        <p>Stay informed about the latest developments in our CRM platform</p>
      </div>
      
      <div className="news-grid">
        {newsItems.map((item) => (
          <article key={item.id} className="news-card">
            {item.imageUrl && (
              <div className="news-image">
                <img src={item.imageUrl} alt={item.title} />
              </div>
            )}
            <div className="news-content">
              <div className="news-meta">
                <span 
                  className="news-category"
                  style={{ backgroundColor: getCategoryColor(item.category) }}
                >
                  {item.category}
                </span>
                <span className="news-date">{item.date}</span>
              </div>
              <h3 className="news-title">{item.title}</h3>
              <p className="news-summary">{item.summary}</p>
              <button className="read-more-btn">Read More</button>
            </div>
          </article>
        ))}
      </div>
      
      <div className="news-footer">
        <button className="load-more-btn">Load More Articles</button>
      </div>
    </div>
  );
};

export default NewsField;
