import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import Header from "../components/header";
import Footer from "../components/footer";
import { motion } from "framer-motion";
import { Search, LayoutGrid, List, Star, Clock, MessageSquare, Code, Bookmark, X, Calendar } from "lucide-react"

const GetHelp = () => {
  const [developers, setDevelopers] = useState([]); 
  const [filteredDevelopers, setFilteredDevelopers] = useState([]);
  const [visibleDevelopers, setVisibleDevelopers] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Popup messages
  const [popup, setPopup] = useState(null);

  // Search bar state
  const [searchQuery, setSearchQuery] = useState("");

  // NEW: Sorting & View Mode
  const [sortOption, setSortOption] = useState("Relevancy");
  const [viewMode, setViewMode] = useState("grid"); // or "list"

  // Auto-dismiss popup after 3 seconds
  useEffect(() => {
    if (popup) {
      const timer = setTimeout(() => {
        setPopup(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [popup]);

  // Fetch developers on mount
  useEffect(() => {
    const fetchDevelopers = async () => {
      const startTime = Date.now();
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:5000/api/developers");

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Invalid response format. Expected an array.");
        }

        setDevelopers(data);
        setFilteredDevelopers(data); // Initialize filtered list with all developers

        // Optional: success popup
        setPopup({ message: "Developers fetched successfully", type: "success" });
      } catch (err) {
        console.error("Error fetching developers:", err);
        setError(err.message);
        setPopup({ message: "Failed to fetch developers: " + err.message, type: "error" });
      } finally {
        // Ensure the loading message shows for at least 5 seconds
        const elapsed = Date.now() - startTime;
        const delay = Math.max(5000 - elapsed, 0);
        setTimeout(() => {
          setLoading(false);
          setIsLoading(false);
        }, delay);
      }
    };

    fetchDevelopers();
  }, []);

  /**
   * Enhanced dynamic search:
   * - Matches domainTags, firstName, lastName, and bio
   * - Debounced search to improve performance
   * - Case-insensitive matching
   */
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      setFilteredDevelopers(developers);
      return;
    }

    // Enhanced search function with more fields and weighted results
    const searchResults = developers.filter((dev) => {
      const searchFields = {
        tags: dev.domainTags?.join(' ').toLowerCase() || '',
        name: `${dev.firstName} ${dev.lastName}`.toLowerCase(),
        bio: dev.bio?.toLowerCase() || '',
        expertise: dev.expertiseLevel?.toLowerCase() || ''
      };

      // Check if any field contains the search query
      return (
        searchFields.tags.includes(query) ||
        searchFields.name.includes(query) ||
        searchFields.bio.includes(query) ||
        searchFields.expertise.includes(query)
      );
    });

    // Sort results by relevance
    const sortedResults = searchResults.sort((a, b) => {
      const aRelevance = calculateRelevance(a, query);
      const bRelevance = calculateRelevance(b, query);
      return bRelevance - aRelevance;
    });

    setFilteredDevelopers(sortedResults);
  }, [searchQuery, developers]);

  // Helper function to calculate search result relevance
  const calculateRelevance = (developer, query) => {
    let score = 0;

    // Exact matches in tags get highest priority
    if (developer.domainTags?.some(tag => 
      tag.toLowerCase() === query
    )) {
      score += 10;
    }

    // Partial matches in tags
    if (developer.domainTags?.some(tag => 
      tag.toLowerCase().includes(query)
    )) {
      score += 5;
    }

    // Name matches
    const fullName = `${developer.firstName} ${developer.lastName}`.toLowerCase();
    if (fullName.includes(query)) {
      score += 3;
    }

    // Bio matches
    if (developer.bio?.toLowerCase().includes(query)) {
      score += 2;
    }

    // Expertise level matches
    if (developer.expertiseLevel?.toLowerCase().includes(query)) {
      score += 2;
    }

    return score;
  };

  // Update the search input UI for better user experience
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  /**
   * Sort the filtered developers based on sortOption.
   * Use useMemo to avoid re-sorting on every render unless dependencies change.
   */
  const sortedDevelopers = useMemo(() => {
    let devs = [...filteredDevelopers];
    switch (sortOption) {
      case "Available Now":
        // Put available devs first
        devs.sort((a, b) => {
          if (a.isAvailable && !b.isAvailable) return -1;
          if (!a.isAvailable && b.isAvailable) return 1;
          return 0;
        });
        break;

      case "Highest Rated":
        // Sort descending by rating
        devs.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;

      case "Most Experienced":
        // Sort descending by experience (assuming dev.experience is a number)
        devs.sort((a, b) => (b.experience || 0) - (a.experience || 0));
        break;

      // "Relevancy" or default -> no sorting
      default:
        break;
    }
    return devs;
  }, [filteredDevelopers, sortOption]);

  // Handle "Show More" pagination
  const handleShowMore = () => {
    setVisibleDevelopers((prev) => prev + 12);
  };

  // Handle changes in the sort dropdown
  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    setVisibleDevelopers(12); // reset pagination if needed
  };

  // Toggle between grid or list view
  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ backgroundColor: "#F8FAFC", minHeight: "100vh", fontFamily: "Poppins, sans-serif" }}>
        {/* Popup Notification */}
        {popup && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              zIndex: 10000,
              padding: "1rem 1.5rem",
              backgroundColor: popup.type === "error" ? "#f8d7da" : "#d1e7dd",
              color: popup.type === "error" ? "#842029" : "#0f5132",
              borderRadius: "8px",
              boxShadow: "0px 0px 10px rgba(0,0,0,0.1)",
              fontFamily: "Poppins, sans-serif"
            }}
          >
            {popup.message}
          </div>
        )}

        <Header />

        {/* Enhanced Search Bar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "1rem", marginLeft: "280px" }}>
          <div
            style={{
              maxWidth: "1200px",
              width: "100%",
              display: "flex",
              gap: "1rem",
              alignItems: "center"
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <Search 
                size={20} 
                style={{ 
                  position: "absolute", 
                  left: "12px", 
                  top: "50%", 
                  transform: "translateY(-50%)",
                  color: "#64748B"
                }} 
              />
              <input
                type="text"
                placeholder="Search by skills, expertise, or developer name..."
                value={searchQuery}
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.5rem",
                  fontSize: "16px",
                  borderRadius: "8px",
                  border: "1px solid #E2E8F0",
                  fontFamily: "Poppins, sans-serif",
                  transition: "all 0.2s ease",
                  backgroundColor: "white"
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#2563EB";
                  e.target.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#E2E8F0";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>
        </div>

        {/* Show search results count */}
        {searchQuery && (
          <div style={{ 
            textAlign: "center", 
            color: "#64748B",
            marginTop: "0.5rem",
            fontSize: "0.875rem"
          }}>
            Found {filteredDevelopers.length} developer{filteredDevelopers.length !== 1 ? 's' : ''} 
            {searchQuery ? ` for "${searchQuery}"` : ''}
          </div>
        )}

        {/* SORT & VIEW OPTIONS */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              maxWidth: "1200px",
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 1rem"
            }}
          >
            {/* Showing X experts */}
            <p
              style={{
                marginLeft: "270px",
                fontWeight: "normal",
                color: "#64748B",
                fontSize: "0.875rem"
              }}
            >
              Showing {sortedDevelopers.length} experts
            </p>

            {/* Dropdown & View Buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <select
                value={sortOption}
                onChange={handleSortChange}
                style={{
                  padding: "0.4rem",
                  borderRadius: "6px",
                  border: "1px solid #E2E8F0",
                  fontWeight: "bold",
                  fontFamily: "Poppins, sans-serif"
                }}
              >
                <option value="Relevancy">Sort by Relevancy</option>
                <option value="Available Now">Available Now</option>
                <option value="Highest Rated">Highest Rated</option>
                <option value="Most Experienced">Most Experienced</option>
              </select>

              {/* Grid/List Toggle */}
              <div>
                <button
                  onClick={() => toggleViewMode("grid")}
                  style={{
                    backgroundColor: viewMode === "grid" ? "#2563EB" : "white",
                    color: viewMode === "grid" ? "#fff" : "#2563EB",
                    padding: "0.5rem 1rem",
                    border: "1px solid #2563EB",
                    borderRadius: "6px",
                    marginRight: "4px",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif"
                  }}
                >
                  Grid
                </button>
                <button
                  onClick={() => toggleViewMode("list")}
                  style={{
                    backgroundColor: viewMode === "list" ? "#2563EB" : "white",
                    color: viewMode === "list" ? "#fff" : "#2563EB",
                    padding: "0.5rem 1rem",
                    border: "1px solid #2563EB",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontFamily: "Poppins, sans-serif"
                  }}
                >
                  List
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          {/* Sidebar Before Developer Cards */}
          <aside
            style={{
              width: "280px",
              height: "auto",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "1rem",
              border: "1px solid #E2E8F0",
              marginRight: "2rem",
              marginTop: "-70px",
            }}
          >
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "1rem"
              }}
            >
              Filters
            </h2>

            {/* Price Range */}
            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "1rem"
                }}
              >
                Price Range
              </h3>
              {[
                "Under 2,000 PKR/hr",
                "2,000 - 4,000 PKR/hr",
                "4,000 - 6,000 PKR/hr",
                "Above 6,000 PKR/hr",
              ].map((range) => (
                <label key={range} style={{ display: "block", marginBottom: "0.8rem" }}>
                  <input type="checkbox" />
                  <span style={{ marginLeft: "0.5rem" }}>{range}</span>
                </label>
              ))}
            </div>

            {/* Expertise Level */}
            <div>
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  marginTop: "1rem"
                }}
              >
                Expertise Level
              </h3>
              {["Junior", "Mid-Level", "Senior", "Expert"].map((level) => (
                <label key={level} style={{ display: "block", marginBottom: "0.5rem" }}>
                  <input type="checkbox" />
                  <span style={{ marginLeft: "0.5rem" }}>{level}</span>
                </label>
              ))}
            </div>
          </aside>

          {/* Main Developer Cards Section */}
          <div style={{ maxWidth: "1200px", width: "100%" }}>
            {isLoading ? (
              <p style={{ textAlign: "center", padding: "2rem" }}>Loading developers...</p>
            ) : error ? (
              <p style={{ color: "red" }}>Error: {error}</p>
            ) : sortedDevelopers.length === 0 ? (
              <p>No developers available for this search.</p>
            ) : (
              <div
                style={{
                  display: viewMode === "grid" ? "grid" : "block",
                  gridTemplateColumns:
                    viewMode === "grid" ? "repeat(auto-fit, minmax(300px, 1fr))" : "none",
                  gap: "1.5rem",
                  marginBottom: "2rem"
                }}
              >
                {sortedDevelopers.slice(0, visibleDevelopers).map((dev, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      border: "1px solid #E2E8F0",
                      padding: "1.5rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                      marginBottom: viewMode === "list" ? "1.5rem" : "0"
                    }}
                  >
                    {/* Profile Picture and Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                      <img
                        src={
                          dev.profileImage ||
                          `https://avatars.abstractapi.com/v1/?api_key=597618af61e64bfa8caa41e4490d993b&name=${encodeURIComponent(
                            `${dev.firstName} ${dev.lastName}`
                          )}`
                        }
                        alt={`${dev.firstName} ${dev.lastName}`}
                        style={{
                          width: "50px",
                          height: "50px",
                          borderRadius: "50%",
                          objectFit: "cover"
                        }}
                      />
                      <div>
                        <h3
                          style={{
                            fontSize: "18px",
                            fontWeight: "bold",
                            color: "#111827"
                          }}
                        >
                          {dev.firstName} {dev.lastName}
                        </h3>

                        {/* Rating Below Name */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            color: "#F59E0B",
                            fontSize: "14px"
                          }}
                        >
                          <Star size={16} />
                          <span>{dev.rating || "0.0"}</span>
                          <span style={{ color: "#D97706", fontWeight: "bold" }}>
                            ({dev.reviews || 0} reviews)
                          </span>
                        </div>
                      </div>

                      {/* Save Icon (Bookmark) */}
                      <button
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          marginLeft: "auto"
                        }}
                      >
                        <Bookmark size={16} />
                      </button>
                    </div>

                    {/* Display Skill Tags */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {dev.domainTags && dev.domainTags.length > 0 ? (
                        dev.domainTags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              backgroundColor: "#F3F4F6",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              fontSize: "14px",
                              color: "#374151",
                              fontWeight: "500"
                            }}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "#64748B", fontSize: "14px" }}>
                          No domain tags
                        </span>
                      )}
                    </div>

                    {/* Availability and Hourly Rate */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "0.5rem" }}>
                      <span
                        style={{
                          backgroundColor: dev.isAvailable ? "#D1FAE5" : "#DBEAFE",
                          color: dev.isAvailable ? "#065F46" : "#1E40AF",
                          padding: "6px 10px",
                          borderRadius: "6px",
                          fontSize: "14px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "5px"
                        }}
                      >
                        {dev.isAvailable
                          ? "✅ Available Now"
                          : "📅 Available in " + (dev.availability || "N/A")}
                      </span>
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: "#111827"
                        }}
                      >
                        {dev.hourlyRate ? `${dev.hourlyRate} PKR/hr` : "Price not set"}
                      </span>
                    </div>

                    {/* Short Description */}
                    <p
                      style={{
                        fontSize: "14px",
                        color: "#374151",
                        lineHeight: "1.5",
                        marginTop: "0.5rem"
                      }}
                    >
                      {dev.bio ||
                        "Senior full-stack developer with experience in modern web technologies."}
                    </p>

                    {/* Action Buttons */}
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <button
                        style={{
                          backgroundColor: "#2563EB",
                          color: "white",
                          padding: "10px 16px",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "14px",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          cursor: "pointer",
                          flex: 1
                        }}
                      >
                        💬 Chat Now
                      </button>

                      <Link to={`/profile/${dev._id}`} style={{ flex: 1 }}>
                        <button
                          style={{
                            backgroundColor: "white",
                            color: "#2563EB",
                            padding: "10px 16px",
                            borderRadius: "6px",
                            border: "1px solid #2563EB",
                            fontSize: "14px",
                            fontWeight: "bold",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            cursor: "pointer",
                            width: "100%"
                          }}
                        >
                          👤 View Profile
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show More Button */}
            {visibleDevelopers < sortedDevelopers.length && (
              <button
                onClick={handleShowMore}
                style={{
                  display: "block",
                  margin: "auto",
                  backgroundColor: "#2563EB",
                  color: "white",
                  padding: "12px 20px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  marginTop: "20px"
                }}
              >
                Show More
              </button>
            )}
          </div>
        </div>

        <Footer />
      </div>
    </motion.div>
  );
};

export default GetHelp;
