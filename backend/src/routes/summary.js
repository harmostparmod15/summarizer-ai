


const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const Article = require('../models/Article');
const Summary = require('../models/Summary');
const auth = require('../middlewares/auth'); 

dotenv.config();

const router = express.Router();



// // POST /api/summary

router.post('/', auth, async (req, res) => {
  try {
    const { title, author, content } = req.body;

    if (!content || !title) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const userId = req.user.id;

    const article = await Article.create({
      title,
      author: author || 'Unknown',
      content,
      user: userId, // 🔥 attach user ID from middleware
    });

    // NLP Cloud API
    const response = await axios.post(
      'https://api.nlpcloud.io/v1/gpu/gpt-oss-120b/summarization',
      { text: content },
      {
        headers: {
          Authorization: `Token ${process.env.NLP_CLOUD_API_KEY}`,
          'Content-Type': 'application/json',
         
        },
        timeout: 20000,
      }
    );

    //
    const summaryText = response.data.summary_text || response.data.summary || 'No summary returned.';

    //  Saving summary with article
    const summary = await Summary.create({
      article: article._id,
      summaryText,
    });

    res.status(201).json({
      message: 'Article and summary created successfully.',
      article,
      summary,
    });
  } catch (err) {
    console.error('Error creating summary:', err.response?.data || err.message);
    res.status(500).json({
      message: 'Server error while summarizing the article.',
      error: err.response?.data || err.message,
    });
  }
});


// GET /api/summaries
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const summaries = await Summary.find()
      .populate({
        path: 'article',
        match: { user: userId },
        select: 'title author content createdAt',
      })
      .sort({ createdAt: -1 });

    //  Filtering out null values
    const userSummaries = summaries.filter((s) => s.article);

    res.status(200).json(userSummaries);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summaries.', error: err.message });
  }
});


//  get /:id [ one summary ] 
router.get('/:id', auth, async (req, res) => {
  try {
    const summary = await Summary.findById(req.params.id).populate('article');
    if (!summary) return res.status(404).json({ message: 'Summary not found.' });

    // authorization check
    if (summary.article.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized.' });

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching summary.', error: err.message });
  }
});

//  UPDATE /summaries/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const { summaryText } = req.body;
    const summary = await Summary.findById(req.params.id).populate('article');
    if (!summary) return res.status(404).json({ message: 'Summary not found.' });

    if (summary.article.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized.' });

    summary.summaryText = summaryText || summary.summaryText;
    await summary.save();

    res.status(200).json({ message: 'Summary updated successfully.', summary });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update summary.', error: err.message });
  }
});


router.delete('/:id', auth, async (req, res) => {
  try {
    const summary = await Summary.findById(req.params.id).populate('article');
    if (!summary) return res.status(404).json({ message: 'Summary not found.' });

    if (summary.article.user.toString() !== req.user.id)
      return res.status(403).json({ message: 'Not authorized.' });

    //  Deleting article
    if (summary.article?._id) {
      await Article.findByIdAndDelete(summary.article._id);
    }

    // deleting summary
    await Summary.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Summary and linked article deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete summary.', error: err.message });
  }
});


module.exports = router;