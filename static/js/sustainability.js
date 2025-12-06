$(function () {
  $(".topic-btn").on("click", function () {
    var query = $(this).data("query");
    $("#sustainQuery").val(query);
    $("#askSustainBtn").trigger("click");
  });

  $("#askSustainBtn").on("click", function () {
    var query = $("#sustainQuery").val().trim();

    if (!query) {
      $("#sustainError")
        .text("Please enter a question about sustainable farming.")
        .show();
      return;
    }

    $("#sustainError").hide();
    $("#sustainResult").hide();
    $("#loadingSustain").show();
    $("#askSustainBtn").prop("disabled", true);

    $.ajax({
      type: "POST",
      url: "/api/sustainability",
      contentType: "application/json",
      data: JSON.stringify({ query: query }),
      success: function (response) {
        $("#loadingSustain").hide();
        $("#askSustainBtn").prop("disabled", false);

        if (response.error) {
          $("#sustainError").text(response.error).show();
          return;
        }

        $("#sustainContent").html(formatMarkdown(response.answer));
        $("#sustainResult").show();
      },
      error: function () {
        $("#loadingSustain").hide();
        $("#askSustainBtn").prop("disabled", false);
        $("#sustainError")
          .text("Error getting advice. Please try again.")
          .show();
      },
    });
  });

  $("#sustainQuery").on("keypress", function (e) {
    if (e.which == 13 && !e.shiftKey) {
      e.preventDefault();
      $("#askSustainBtn").trigger("click");
    }
  });

  function formatMarkdown(text) {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/^### (.*$)/gm, "<h4>$1</h4>")
      .replace(/^## (.*$)/gm, "<h3>$1</h3>")
      .replace(/^# (.*$)/gm, "<h2>$1</h2>")
      .replace(/^\- (.*$)/gm, "• $1")
      .replace(/^\d+\. (.*$)/gm, "<li>$1</li>")
      .replace(/\n/g, "<br>");
  }
});
