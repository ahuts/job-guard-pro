import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Search, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { JobScan, GhostScore, getScoreColor, getScoreLabel } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface JobHistoryTableProps {
  jobs: JobScan[];
  onJobClick: (job: JobScan) => void;
  onDeleteJob?: (jobId: string) => void;
  loading?: boolean;
}

type SortField = "company" | "title" | "ghostScore" | "status" | "createdAt";
type SortDirection = "asc" | "desc";

export default function JobHistoryTable({
  jobs,
  onJobClick,
  onDeleteJob,
  loading = false,
}: JobHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<GhostScore | "all">("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedJobs = useMemo(() => {
    let result = [...jobs];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (job) =>
          job.company.toLowerCase().includes(query) ||
          job.title.toLowerCase().includes(query)
      );
    }

    // Filter by score
    if (scoreFilter !== "all") {
      result = result.filter((job) => job.ghostScoreCategory === scoreFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "company":
          comparison = a.company.localeCompare(b.company);
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "ghostScore":
          comparison = b.ghostScore - a.ghostScore; // Higher score first
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [jobs, searchQuery, scoreFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronDown className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Saved":
        return "bg-muted text-muted-foreground";
      case "Applied":
        return "bg-primary/10 text-primary";
      case "Interviewing":
        return "bg-warning/10 text-warning";
      case "Offer":
        return "bg-safe/10 text-safe";
      case "Rejected":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={scoreFilter} onValueChange={(value) => setScoreFilter(value as GhostScore | "all")}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="critical">Critical Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  <button
                    onClick={() => handleSort("company")}
                    className="flex items-center gap-1 font-medium group"
                  >
                    Company
                    <SortIcon field="company" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("title")}
                    className="flex items-center gap-1 font-medium group"
                  >
                    Title
                    <SortIcon field="title" />
                  </button>
                </TableHead>
                <TableHead className="w-32">
                  <button
                    onClick={() => handleSort("ghostScore")}
                    className="flex items-center gap-1 font-medium group"
                  >
                    Ghost Score
                    <SortIcon field="ghostScore" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center gap-1 font-medium group"
                  >
                    Status
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("createdAt")}
                    className="flex items-center gap-1 font-medium group"
                  >
                    Date
                    <SortIcon field="createdAt" />
                  </button>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery || scoreFilter !== "all"
                      ? "No jobs match your filters"
                      : "No jobs scanned yet"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onJobClick(job)}
                  >
                    <TableCell className="font-medium">{job.company}</TableCell>
                    <TableCell className="max-w-xs truncate" title={job.title}>
                      {job.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-3 w-3 rounded-full",
                            getScoreColor(job.ghostScore)
                          )}
                        />
                        <span className="font-semibold">{job.ghostScore}</span>
                        <span className="text-xs text-muted-foreground">
                          {getScoreLabel(job.ghostScore)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(job.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onJobClick(job); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {onDeleteJob && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteJob(job.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
      </div>
    </div>
  );
}
