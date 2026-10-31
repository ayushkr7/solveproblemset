/**
 * NeetCode's Blind 75: every problem in list order, with its LeetCode link and its
 * NeetCode practice link.
 */

export type Blind75Difficulty = "Easy" | "Medium" | "Hard";

export interface Blind75Problem {
  /** Position in the list, from 1. */
  sNo: number;
  problem: string;
  difficulty: Blind75Difficulty;
  leetCodeUrl: string;
  neetCodeUrl: string;
}

export const NEETCODE_BLIND_75_PROBLEMS: readonly Blind75Problem[] = [
  { sNo: 1, problem: "Contains Duplicate", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/contains-duplicate/", neetCodeUrl: "https://neetcode.io/problems/duplicate-integer/question?list=blind75" },
  { sNo: 2, problem: "Valid Anagram", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/valid-anagram/", neetCodeUrl: "https://neetcode.io/problems/is-anagram/question?list=blind75" },
  { sNo: 3, problem: "Two Sum", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/two-sum/", neetCodeUrl: "https://neetcode.io/problems/two-integer-sum/question?list=blind75" },
  { sNo: 4, problem: "Group Anagrams", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/group-anagrams/", neetCodeUrl: "https://neetcode.io/problems/anagram-groups/question?list=blind75" },
  { sNo: 5, problem: "Top K Frequent Elements", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/top-k-frequent-elements/", neetCodeUrl: "https://neetcode.io/problems/top-k-elements-in-list/question?list=blind75" },
  { sNo: 6, problem: "Encode and Decode Strings", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/encode-and-decode-strings/", neetCodeUrl: "https://neetcode.io/problems/string-encode-and-decode/question?list=blind75" },
  { sNo: 7, problem: "Product of Array Except Self", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/product-of-array-except-self/", neetCodeUrl: "https://neetcode.io/problems/products-of-array-discluding-self/question?list=blind75" },
  { sNo: 8, problem: "Longest Consecutive Sequence", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-consecutive-sequence/", neetCodeUrl: "https://neetcode.io/problems/longest-consecutive-sequence/question?list=blind75" },
  { sNo: 9, problem: "Valid Palindrome", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/valid-palindrome/", neetCodeUrl: "https://neetcode.io/problems/is-palindrome/question?list=blind75" },
  { sNo: 10, problem: "3Sum", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/3sum/", neetCodeUrl: "https://neetcode.io/problems/three-integer-sum/question?list=blind75" },
  { sNo: 11, problem: "Container With Most Water", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/container-with-most-water/", neetCodeUrl: "https://neetcode.io/problems/max-water-container/question?list=blind75" },
  { sNo: 12, problem: "Best Time to Buy And Sell Stock", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", neetCodeUrl: "https://neetcode.io/problems/buy-and-sell-crypto/question?list=blind75" },
  { sNo: 13, problem: "Longest Substring Without Repeating Characters", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", neetCodeUrl: "https://neetcode.io/problems/longest-substring-without-duplicates/question?list=blind75" },
  { sNo: 14, problem: "Longest Repeating Character Replacement", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-repeating-character-replacement/", neetCodeUrl: "https://neetcode.io/problems/longest-repeating-substring-with-replacement/question?list=blind75" },
  { sNo: 15, problem: "Minimum Window Substring", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/minimum-window-substring/", neetCodeUrl: "https://neetcode.io/problems/minimum-window-with-characters/question?list=blind75" },
  { sNo: 16, problem: "Find Minimum In Rotated Sorted Array", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/", neetCodeUrl: "https://neetcode.io/problems/find-minimum-in-rotated-sorted-array/question?list=blind75" },
  { sNo: 17, problem: "Search In Rotated Sorted Array", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/search-in-rotated-sorted-array/", neetCodeUrl: "https://neetcode.io/problems/find-target-in-rotated-sorted-array/question?list=blind75" },
  { sNo: 18, problem: "Reverse Linked List", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/reverse-linked-list/", neetCodeUrl: "https://neetcode.io/problems/reverse-a-linked-list/question?list=blind75" },
  { sNo: 19, problem: "Merge Two Sorted Lists", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/merge-two-sorted-lists/", neetCodeUrl: "https://neetcode.io/problems/merge-two-sorted-linked-lists/question?list=blind75" },
  { sNo: 20, problem: "Linked List Cycle", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/linked-list-cycle/", neetCodeUrl: "https://neetcode.io/problems/linked-list-cycle-detection/question?list=blind75" },
  { sNo: 21, problem: "Reorder List", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/reorder-list/", neetCodeUrl: "https://neetcode.io/problems/reorder-linked-list/question?list=blind75" },
  { sNo: 22, problem: "Remove Nth Node From End of List", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/remove-nth-node-from-end-of-list/", neetCodeUrl: "https://neetcode.io/problems/remove-node-from-end-of-linked-list/question?list=blind75" },
  { sNo: 23, problem: "Merge K Sorted Lists", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/merge-k-sorted-lists/", neetCodeUrl: "https://neetcode.io/problems/merge-k-sorted-linked-lists/question?list=blind75" },
  { sNo: 24, problem: "Valid Parentheses", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/valid-parentheses/", neetCodeUrl: "https://neetcode.io/problems/validate-parentheses/question?list=blind75" },
  { sNo: 25, problem: "Invert Binary Tree", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/invert-binary-tree/", neetCodeUrl: "https://neetcode.io/problems/invert-a-binary-tree/question?list=blind75" },
  { sNo: 26, problem: "Maximum Depth of Binary Tree", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/maximum-depth-of-binary-tree/", neetCodeUrl: "https://neetcode.io/problems/depth-of-binary-tree/question?list=blind75" },
  { sNo: 27, problem: "Same Tree", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/same-tree/", neetCodeUrl: "https://neetcode.io/problems/same-binary-tree/question?list=blind75" },
  { sNo: 28, problem: "Subtree of Another Tree", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/subtree-of-another-tree/", neetCodeUrl: "https://neetcode.io/problems/subtree-of-a-binary-tree/question?list=blind75" },
  { sNo: 29, problem: "Lowest Common Ancestor of a Binary Search Tree", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/", neetCodeUrl: "https://neetcode.io/problems/lowest-common-ancestor-in-binary-search-tree/question?list=blind75" },
  { sNo: 30, problem: "Binary Tree Level Order Traversal", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal/", neetCodeUrl: "https://neetcode.io/problems/level-order-traversal-of-binary-tree/question?list=blind75" },
  { sNo: 31, problem: "Validate Binary Search Tree", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/validate-binary-search-tree/", neetCodeUrl: "https://neetcode.io/problems/valid-binary-search-tree/question?list=blind75" },
  { sNo: 32, problem: "Kth Smallest Element In a Bst", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/", neetCodeUrl: "https://neetcode.io/problems/kth-smallest-integer-in-bst/question?list=blind75" },
  { sNo: 33, problem: "Construct Binary Tree From Preorder And Inorder Traversal", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/", neetCodeUrl: "https://neetcode.io/problems/binary-tree-from-preorder-and-inorder-traversal/question?list=blind75" },
  { sNo: 34, problem: "Binary Tree Maximum Path Sum", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/binary-tree-maximum-path-sum/", neetCodeUrl: "https://neetcode.io/problems/binary-tree-maximum-path-sum/question?list=blind75" },
  { sNo: 35, problem: "Serialize And Deserialize Binary Tree", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/", neetCodeUrl: "https://neetcode.io/problems/serialize-and-deserialize-binary-tree/question?list=blind75" },
  { sNo: 36, problem: "Implement Trie Prefix Tree", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/implement-trie-prefix-tree/", neetCodeUrl: "https://neetcode.io/problems/implement-prefix-tree/question?list=blind75" },
  { sNo: 37, problem: "Design Add And Search Words Data Structure", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/design-add-and-search-words-data-structure/", neetCodeUrl: "https://neetcode.io/problems/design-word-search-data-structure/question?list=blind75" },
  { sNo: 38, problem: "Word Search II", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/word-search-ii/", neetCodeUrl: "https://neetcode.io/problems/search-for-word-ii/question?list=blind75" },
  { sNo: 39, problem: "Combination Sum", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/combination-sum/", neetCodeUrl: "https://neetcode.io/problems/combination-target-sum/question?list=blind75" },
  { sNo: 40, problem: "Word Search", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/word-search/", neetCodeUrl: "https://neetcode.io/problems/search-for-word/question?list=blind75" },
  { sNo: 41, problem: "Find Median From Data Stream", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/find-median-from-data-stream/", neetCodeUrl: "https://neetcode.io/problems/find-median-in-a-data-stream/question?list=blind75" },
  { sNo: 42, problem: "Number of Islands", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/number-of-islands/", neetCodeUrl: "https://neetcode.io/problems/count-number-of-islands/question?list=blind75" },
  { sNo: 43, problem: "Clone Graph", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/clone-graph/", neetCodeUrl: "https://neetcode.io/problems/clone-graph/question?list=blind75" },
  { sNo: 44, problem: "Pacific Atlantic Water Flow", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/pacific-atlantic-water-flow/", neetCodeUrl: "https://neetcode.io/problems/pacific-atlantic-water-flow/question?list=blind75" },
  { sNo: 45, problem: "Course Schedule", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/course-schedule/", neetCodeUrl: "https://neetcode.io/problems/course-schedule/question?list=blind75" },
  { sNo: 46, problem: "Graph Valid Tree", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/graph-valid-tree/", neetCodeUrl: "https://neetcode.io/problems/valid-tree/question?list=blind75" },
  { sNo: 47, problem: "Number of Connected Components In An Undirected Graph", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/", neetCodeUrl: "https://neetcode.io/problems/count-connected-components/question?list=blind75" },
  { sNo: 48, problem: "Alien Dictionary", difficulty: "Hard", leetCodeUrl: "https://leetcode.com/problems/alien-dictionary/", neetCodeUrl: "https://neetcode.io/problems/foreign-dictionary/question?list=blind75" },
  { sNo: 49, problem: "Climbing Stairs", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/climbing-stairs/", neetCodeUrl: "https://neetcode.io/problems/climbing-stairs/question?list=blind75" },
  { sNo: 50, problem: "House Robber", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/house-robber/", neetCodeUrl: "https://neetcode.io/problems/house-robber/question?list=blind75" },
  { sNo: 51, problem: "House Robber II", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/house-robber-ii/", neetCodeUrl: "https://neetcode.io/problems/house-robber-ii/question?list=blind75" },
  { sNo: 52, problem: "Longest Palindromic Substring", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-palindromic-substring/", neetCodeUrl: "https://neetcode.io/problems/longest-palindromic-substring/question?list=blind75" },
  { sNo: 53, problem: "Palindromic Substrings", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/palindromic-substrings/", neetCodeUrl: "https://neetcode.io/problems/palindromic-substrings/question?list=blind75" },
  { sNo: 54, problem: "Decode Ways", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/decode-ways/", neetCodeUrl: "https://neetcode.io/problems/decode-ways/question?list=blind75" },
  { sNo: 55, problem: "Coin Change", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/coin-change/", neetCodeUrl: "https://neetcode.io/problems/coin-change/question?list=blind75" },
  { sNo: 56, problem: "Maximum Product Subarray", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/maximum-product-subarray/", neetCodeUrl: "https://neetcode.io/problems/maximum-product-subarray/question?list=blind75" },
  { sNo: 57, problem: "Word Break", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/word-break/", neetCodeUrl: "https://neetcode.io/problems/word-break/question?list=blind75" },
  { sNo: 58, problem: "Longest Increasing Subsequence", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-increasing-subsequence/", neetCodeUrl: "https://neetcode.io/problems/longest-increasing-subsequence/question?list=blind75" },
  { sNo: 59, problem: "Unique Paths", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/unique-paths/", neetCodeUrl: "https://neetcode.io/problems/count-paths/question?list=blind75" },
  { sNo: 60, problem: "Longest Common Subsequence", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/longest-common-subsequence/", neetCodeUrl: "https://neetcode.io/problems/longest-common-subsequence/question?list=blind75" },
  { sNo: 61, problem: "Maximum Subarray", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/maximum-subarray/", neetCodeUrl: "https://neetcode.io/problems/maximum-subarray/question?list=blind75" },
  { sNo: 62, problem: "Jump Game", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/jump-game/", neetCodeUrl: "https://neetcode.io/problems/jump-game/question?list=blind75" },
  { sNo: 63, problem: "Insert Interval", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/insert-interval/", neetCodeUrl: "https://neetcode.io/problems/insert-new-interval/question?list=blind75" },
  { sNo: 64, problem: "Merge Intervals", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/merge-intervals/", neetCodeUrl: "https://neetcode.io/problems/merge-intervals/question?list=blind75" },
  { sNo: 65, problem: "Non Overlapping Intervals", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/non-overlapping-intervals/", neetCodeUrl: "https://neetcode.io/problems/non-overlapping-intervals/question?list=blind75" },
  { sNo: 66, problem: "Meeting Rooms", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/meeting-rooms/", neetCodeUrl: "https://neetcode.io/problems/meeting-schedule/question?list=blind75" },
  { sNo: 67, problem: "Meeting Rooms II", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/meeting-rooms-ii/", neetCodeUrl: "https://neetcode.io/problems/meeting-schedule-ii/question?list=blind75" },
  { sNo: 68, problem: "Number of 1 Bits", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/number-of-1-bits/", neetCodeUrl: "https://neetcode.io/problems/number-of-one-bits/question?list=blind75" },
  { sNo: 69, problem: "Counting Bits", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/counting-bits/", neetCodeUrl: "https://neetcode.io/problems/counting-bits/question?list=blind75" },
  { sNo: 70, problem: "Reverse Bits", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/reverse-bits/", neetCodeUrl: "https://neetcode.io/problems/reverse-bits/question?list=blind75" },
  { sNo: 71, problem: "Missing Number", difficulty: "Easy", leetCodeUrl: "https://leetcode.com/problems/missing-number/", neetCodeUrl: "https://neetcode.io/problems/missing-number/question?list=blind75" },
  { sNo: 72, problem: "Sum of Two Integers", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/sum-of-two-integers/", neetCodeUrl: "https://neetcode.io/problems/sum-of-two-integers/question?list=blind75" },
  { sNo: 73, problem: "Rotate Image", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/rotate-image/", neetCodeUrl: "https://neetcode.io/problems/rotate-matrix/question?list=blind75" },
  { sNo: 74, problem: "Spiral Matrix", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/spiral-matrix/", neetCodeUrl: "https://neetcode.io/problems/spiral-matrix/question?list=blind75" },
  { sNo: 75, problem: "Set Matrix Zeroes", difficulty: "Medium", leetCodeUrl: "https://leetcode.com/problems/set-matrix-zeroes/", neetCodeUrl: "https://neetcode.io/problems/set-zeroes-in-matrix/question?list=blind75" },
];
